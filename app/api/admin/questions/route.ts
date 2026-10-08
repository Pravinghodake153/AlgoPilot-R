import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { authorizeAdmin } from "@/lib/admin-auth";
import { STANDARD_5_QUESTIONS_TEMPLATE } from "@/lib/default-questions";

export async function GET(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const jobRoleId = url.searchParams.get("jobRoleId");

    let activeRole = null;
    if (jobRoleId) {
      activeRole = await prisma.jobRole.findUnique({
        where: { id: jobRoleId },
      });
    }

    let questionsQuery: Prisma.InterviewQuestionWhereInput = {};
    if (jobRoleId) {
      questionsQuery = { jobRoleId };
    } else {
      const defaultRole = await prisma.jobRole.findFirst({
        where: { isDefault: true },
      });
      if (defaultRole) {
        activeRole = defaultRole;
        const roleQCount = await prisma.interviewQuestion.count({
          where: { jobRoleId: defaultRole.id },
        });
        if (roleQCount > 0) {
          questionsQuery = { jobRoleId: defaultRole.id };
        }
      }
    }

    let questions = await prisma.interviewQuestion.findMany({
      where: questionsQuery,
      orderBy: { order: "asc" },
    });

    // If no questions exist yet for this specific query, check fallback
    if (questions.length === 0 && !jobRoleId) {
      questions = await prisma.interviewQuestion.findMany({
        where: { jobRoleId: null },
        orderBy: { order: "asc" },
      });
    }

    // If database has 0 questions altogether, seed default template
    const totalQCount = await prisma.interviewQuestion.count();
    if (totalQCount === 0) {
      for (const q of STANDARD_5_QUESTIONS_TEMPLATE) {
        await prisma.interviewQuestion.create({
          data: {
            jobRoleId: activeRole ? activeRole.id : null,
            order: q.order,
            stage: q.stage,
            category: q.category,
            durationMinutes: q.durationMinutes,
            autoSwitch: q.autoSwitch,
            allowAiSwitch: q.allowAiSwitch,
            options: (q.options as unknown as Prisma.InputJsonValue) ?? undefined,
            correctOption: q.correctOption ?? null,
            explanation: q.explanation || null,
            title: q.title,
            promptText: q.promptText,
            expectedRubric: q.expectedRubric,
            secondaryProbe: q.secondaryProbe || null,
            maxProbes: q.maxProbes,
            isActive: q.isActive,
          },
        });
      }
      questions = await prisma.interviewQuestion.findMany({
        where: activeRole ? { jobRoleId: activeRole.id } : {},
        orderBy: { order: "asc" },
      });
    }

    // System-wide fallback settings
    const modeSetting = await prisma.systemSetting.findUnique({
      where: { key: "INTERVIEW_MODE" },
    });
    const voiceSetting = await prisma.systemSetting.findUnique({
      where: { key: "HYBRID_TTS_VOICE" },
    });
    const interviewerSkillSetting = await prisma.systemSetting.findUnique({
      where: { key: "DYNAMIC_INTERVIEWER_SKILL" },
    });
    const evaluatorSkillSetting = await prisma.systemSetting.findUnique({
      where: { key: "DYNAMIC_EVALUATOR_SKILL" },
    });
    const targetSkillsSetting = await prisma.systemSetting.findUnique({
      where: { key: "DYNAMIC_TARGET_SKILLS" },
    });

    return NextResponse.json({
      questions,
      activeRole,
      interviewMode: activeRole?.mode || modeSetting?.value || "hybrid",
      hybridVoice: activeRole?.hybridVoice || voiceSetting?.value || "af_heart",
      interviewerSkill: activeRole?.interviewerSkill || interviewerSkillSetting?.value || "startup_pragmatist",
      evaluatorSkill: activeRole?.evaluatorSkill || evaluatorSkillSetting?.value || "executive_committee",
      targetSkills: activeRole?.targetSkills || targetSkillsSetting?.value || "System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership",
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Support loading the standard 5 questions template on demand
    if (body.action === "load_standard_template" && body.jobRoleId) {
      await prisma.interviewQuestion.deleteMany({
        where: { jobRoleId: body.jobRoleId },
      });

      for (const q of STANDARD_5_QUESTIONS_TEMPLATE) {
        await prisma.interviewQuestion.create({
          data: {
            jobRoleId: body.jobRoleId,
            order: q.order,
            title: q.title,
            stage: q.stage,
            category: q.category,
            durationMinutes: q.durationMinutes,
            autoSwitch: q.autoSwitch,
            allowAiSwitch: q.allowAiSwitch,
            options: q.options ? (q.options as unknown as Prisma.InputJsonValue) : undefined,
            correctOption: q.correctOption ?? null,
            explanation: q.explanation || null,
            promptText: q.promptText,
            expectedRubric: q.expectedRubric,
            secondaryProbe: q.secondaryProbe || null,
            maxProbes: q.maxProbes,
            isActive: q.isActive,
          },
        });
      }

      const questions = await prisma.interviewQuestion.findMany({
        where: { jobRoleId: body.jobRoleId },
        orderBy: { order: "asc" },
      });
      return NextResponse.json({ success: true, questions });
    }

    const {
      id,
      jobRoleId,
      title,
      stage,
      category,
      durationMinutes,
      autoSwitch,
      allowAiSwitch,
      options,
      correctOption,
      explanation,
      promptText,
      audioUrl,
      expectedRubric,
      secondaryProbe,
      maxProbes,
      order,
      isActive,
    } = body;

    if (!title || !promptText) {
      return NextResponse.json(
        { error: "Title and prompt text are required" },
        { status: 400 }
      );
    }

    const categoryVal = category || "code_editor";
    const durationVal = typeof durationMinutes === "number" ? Math.max(1, durationMinutes) : 5;
    const autoSwitchVal = autoSwitch !== undefined ? Boolean(autoSwitch) : true;
    const allowAiSwitchVal = allowAiSwitch !== undefined ? Boolean(allowAiSwitch) : true;

    if (id) {
      // Update existing question
      const updated = await prisma.interviewQuestion.update({
        where: { id },
        data: {
          title,
          stage: stage || "approach",
          category: categoryVal,
          durationMinutes: durationVal,
          autoSwitch: autoSwitchVal,
          allowAiSwitch: allowAiSwitchVal,
          options: (options as unknown as Prisma.InputJsonValue) ?? undefined,
          correctOption: typeof correctOption === "number" ? correctOption : null,
          explanation: explanation || null,
          promptText,
          audioUrl: audioUrl || null,
          expectedRubric: expectedRubric || [],
          secondaryProbe: secondaryProbe || null,
          maxProbes: typeof maxProbes === "number" ? maxProbes : 1,
          order: typeof order === "number" ? order : 1,
          isActive: isActive !== undefined ? isActive : true,
          ...(jobRoleId !== undefined && { jobRoleId: jobRoleId || null }),
        },
      });
      return NextResponse.json({ success: true, question: updated });
    } else {
      // Create new question
      const maxOrder = await prisma.interviewQuestion.aggregate({
        where: jobRoleId ? { jobRoleId } : {},
        _max: { order: true },
      });
      const nextOrder = (maxOrder?._max?.order || 0) + 1;

      const created = await prisma.interviewQuestion.create({
        data: {
          jobRoleId: jobRoleId || null,
          title,
          stage: stage || "approach",
          category: categoryVal,
          durationMinutes: durationVal,
          autoSwitch: autoSwitchVal,
          allowAiSwitch: allowAiSwitchVal,
          options: (options as unknown as Prisma.InputJsonValue) ?? undefined,
          correctOption: typeof correctOption === "number" ? correctOption : null,
          explanation: explanation || null,
          promptText,
          audioUrl: audioUrl || null,
          expectedRubric: expectedRubric || [],
          secondaryProbe: secondaryProbe || null,
          maxProbes: typeof maxProbes === "number" ? maxProbes : 1,
          order: typeof order === "number" ? order : nextOrder,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      return NextResponse.json({ success: true, question: created });
    }
  } catch (error) {
    console.error("Error creating/updating question:", error);
    return NextResponse.json({ error: "Failed to save question" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const deletedQ = await prisma.interviewQuestion.delete({
      where: { id },
    });

    // Re-index all remaining questions in the same role so orders and titles are strictly 1, 2, 3...
    const remaining = await prisma.interviewQuestion.findMany({
      where: deletedQ.jobRoleId ? { jobRoleId: deletedQ.jobRoleId } : { jobRoleId: null },
      orderBy: { order: "asc" },
    });

    for (let i = 0; i < remaining.length; i++) {
      const cleanTitle = (remaining[i].title || "").replace(/^\d+[\.\:\-]\s*/, "");
      await prisma.interviewQuestion.update({
        where: { id: remaining[i].id },
        data: {
          order: i + 1,
          title: `${i + 1}. ${cleanTitle}`,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
