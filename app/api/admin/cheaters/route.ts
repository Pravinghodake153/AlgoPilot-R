import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all interviews that have any proctoring violation recorded:
    // 1) tabSwitchCount > 0
    // 2) outOfFrameCount > 0
    // 3) multiplePeopleCount > 0
    // 4) Or associated with TAB_SWITCH / CAMERA_OUT_OF_FRAME / MULTIPLE_PERSONS_DETECTED event logs
    
    // First find any interview IDs with cheating events in EventLog
    const cheatEvents = await prisma.eventLog.findMany({
      where: {
        eventType: {
          in: ["TAB_SWITCH", "CAMERA_OUT_OF_FRAME", "MULTIPLE_PERSONS_DETECTED"],
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const eventInterviewIds = Array.from(
      new Set(cheatEvents.map((e) => e.interviewId).filter(Boolean) as string[])
    );

    const flaggedInterviews = await prisma.interview.findMany({
      where: {
        OR: [
          { tabSwitchCount: { gt: 0 } },
          { outOfFrameCount: { gt: 0 } },
          { multiplePeopleCount: { gt: 0 } },
          ...(eventInterviewIds.length > 0 ? [{ id: { in: eventInterviewIds } }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            interviews: {
              orderBy: { createdAt: "asc" },
              select: { id: true, createdAt: true },
            },
          },
        },
        report: {
          select: {
            id: true,
            overallScore: true,
            isSolved: true,
          },
        },
      },
    });

    // Map into detailed cheater incident models
    const cheaters = flaggedInterviews.map((interview) => {
      // Determine interview sequence number for this specific candidate (e.g. Interview #1, #2)
      const userInterviews = interview.user?.interviews || [];
      const interviewIndex = userInterviews.findIndex((i) => i.id === interview.id) + 1;
      const totalCandidateInterviews = userInterviews.length;

      // Extract specific event warnings for this interview
      const interviewEvents = cheatEvents.filter((e) => e.interviewId === interview.id);

      const tabSwitches = Math.max(
        interview.tabSwitchCount || 0,
        interviewEvents.filter((e) => e.eventType === "TAB_SWITCH").length
      );
      const outOfFrameSeconds = interview.outOfFrameCount || 0;
      const multiplePeople = Math.max(
        interview.multiplePeopleCount || 0,
        interviewEvents.filter((e) => e.eventType === "MULTIPLE_PERSONS_DETECTED").length
      );

      const totalViolations =
        tabSwitches +
        (outOfFrameSeconds > 0 ? Math.max(1, Math.ceil(outOfFrameSeconds / 5)) : 0) +
        multiplePeople;

      let riskLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (multiplePeople > 0 || tabSwitches >= 3 || outOfFrameSeconds >= 15) {
        riskLevel = "HIGH";
      } else if (tabSwitches >= 1 || outOfFrameSeconds >= 5) {
        riskLevel = "MEDIUM";
      }

      const modes: string[] = [];
      if (tabSwitches > 0) modes.push(`Tab Switch (${tabSwitches}x)`);
      if (outOfFrameSeconds > 0) modes.push(`Camera Away (${outOfFrameSeconds}s)`);
      if (multiplePeople > 0) modes.push(`Multiple Persons (${multiplePeople}x)`);

      // Compute active duration if start/end timestamps exist (safeguarded against stale/unclosed sessions)
      let activeDurationMinutes = interview.duration;
      if (interview.startedAt && interview.endedAt) {
        const diffMs = new Date(interview.endedAt).getTime() - new Date(interview.startedAt).getTime();
        const calculatedMinutes = Math.max(1, Math.round(diffMs / 60000));
        // If an interview was left open or closed days later, clamp to scheduled interview duration
        activeDurationMinutes = calculatedMinutes <= 180 ? calculatedMinutes : interview.duration;
      }

      // Format warnings list
      const warnings = interviewEvents.map((evt) => {
        let title = "Integrity Warning";
        let message = "Proctoring violation detected";
        const detailsObj = (evt.details as any) || {};

        if (evt.eventType === "TAB_SWITCH") {
          title = "Tab Switch Detected";
          message = detailsObj.message || "Candidate navigated away from the interview tab.";
        } else if (evt.eventType === "CAMERA_OUT_OF_FRAME") {
          title = "Candidate Left Camera Frame";
          message = detailsObj.reason
            ? `${detailsObj.reason} (Duration: ${detailsObj.durationSeconds || 0}s)`
            : "No face detected in video camera feed.";
        } else if (evt.eventType === "MULTIPLE_PERSONS_DETECTED") {
          title = "Multiple Faces in Camera";
          message = detailsObj.reason || "More than one person detected in camera view.";
        }

        return {
          id: evt.id,
          type: evt.eventType,
          timestamp: evt.createdAt.toISOString(),
          title,
          message,
          details: detailsObj,
        };
      });

      // If there are counts in the interview record but no discrete event logs, synthesize summary entries
      if (warnings.length === 0) {
        if (tabSwitches > 0) {
          warnings.push({
            id: `synth-tab-${interview.id}`,
            type: "TAB_SWITCH",
            timestamp: (interview.startedAt || interview.createdAt).toISOString(),
            title: "Tab Switches Recorded",
            message: `Candidate switched browser tabs or minimized window ${tabSwitches} time(s).`,
            details: { count: tabSwitches },
          });
        }
        if (outOfFrameSeconds > 0) {
          warnings.push({
            id: `synth-cam-${interview.id}`,
            type: "CAMERA_OUT_OF_FRAME",
            timestamp: (interview.startedAt || interview.createdAt).toISOString(),
            title: "Out of Camera View",
            message: `Candidate was absent from the webcam frame for a cumulative total of ${outOfFrameSeconds} second(s).`,
            details: { durationSeconds: outOfFrameSeconds },
          });
        }
        if (multiplePeople > 0) {
          warnings.push({
            id: `synth-people-${interview.id}`,
            type: "MULTIPLE_PERSONS_DETECTED",
            timestamp: (interview.startedAt || interview.createdAt).toISOString(),
            title: "Multiple People Detected",
            message: `Machine learning proctor detected additional persons in candidate camera ${multiplePeople} time(s).`,
            details: { facesFound: multiplePeople },
          });
        }
      }

      return {
        id: interview.id,
        interviewNumber: interviewIndex > 0 ? interviewIndex : 1,
        totalInterviewsByUser: totalCandidateInterviews,
        candidate: {
          id: interview.user?.id || interview.userId,
          name: interview.user?.name || "Anonymous Candidate",
          email: interview.user?.email || "Unknown Email",
          imageUrl: interview.user?.imageUrl || null,
        },
        problemTitle: interview.problemTitle,
        difficulty: interview.difficulty,
        status: interview.status,
        timing: {
          createdAt: interview.createdAt.toISOString(),
          startedAt: interview.startedAt ? interview.startedAt.toISOString() : null,
          endedAt: interview.endedAt ? interview.endedAt.toISOString() : null,
          durationMinutes: interview.duration,
          activeDurationMinutes,
        },
        cheatSummary: {
          tabSwitchCount: tabSwitches,
          outOfFrameSeconds,
          multiplePeopleCount: multiplePeople,
          totalViolations,
          riskLevel,
          modes,
        },
        warnings,
        reportId: interview.report?.id || null,
        score: interview.report?.overallScore ?? null,
      };
    });

    return NextResponse.json({
      cheaters,
      metrics: {
        totalCheaters: cheaters.length,
        highRiskCount: cheaters.filter((c) => c.cheatSummary.riskLevel === "HIGH").length,
        totalTabSwitches: cheaters.reduce((sum, c) => sum + c.cheatSummary.tabSwitchCount, 0),
        totalOutOfFrameSeconds: cheaters.reduce(
          (sum, c) => sum + c.cheatSummary.outOfFrameSeconds,
          0
        ),
        totalMultiplePeople: cheaters.reduce(
          (sum, c) => sum + c.cheatSummary.multiplePeopleCount,
          0
        ),
      },
    });
  } catch (error) {
    console.error("[ADMIN_CHEATERS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch cheaters data" }, { status: 500 });
  }
}
