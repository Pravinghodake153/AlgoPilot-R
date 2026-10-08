import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";
import { STANDARD_5_QUESTIONS_TEMPLATE } from "@/lib/default-questions";

/**
 * GET /api/admin/roles
 * Lists all configured Job Roles with question count.
 */
export async function GET() {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const roles = await prisma.jobRole.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { questions: true, interviews: true },
        },
      },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching job roles:", error);
    return NextResponse.json({ error: "Failed to fetch job roles" }, { status: 500 });
  }
}

/**
 * POST /api/admin/roles
 * Creates a new Job Role.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      title,
      slug,
      description,
      department = "Engineering",
      level = "Mid-Level",
      mode = "dynamic",
      hybridVoice = "af_heart",
      interviewerSkill = "startup_pragmatist",
      evaluatorSkill = "executive_committee",
      targetSkills = "System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership",
      isDefault = false,
      copyQuestionsFromRoleId,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    }

    const generatedSlug =
      slug?.trim() ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + `-${Date.now().toString(36)}`;

    // If marked as default, unset other defaults
    if (isDefault) {
      await prisma.jobRole.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const role = await prisma.jobRole.create({
      data: {
        title: title.trim(),
        slug: generatedSlug,
        description: description?.trim() || null,
        department: department?.trim() || "Engineering",
        level: level?.trim() || "Mid-Level",
        mode,
        hybridVoice,
        interviewerSkill,
        evaluatorSkill,
        targetSkills,
        isDefault: Boolean(isDefault),
        isActive: true,
      },
    });

    // Optionally duplicate questions from standard 5 template or another role
    if (copyQuestionsFromRoleId === "global") {
      for (const sq of STANDARD_5_QUESTIONS_TEMPLATE) {
        await prisma.interviewQuestion.create({
          data: {
            jobRoleId: role.id,
            order: sq.order,
            title: sq.title,
            stage: sq.stage,
            category: sq.category,
            durationMinutes: sq.durationMinutes,
            autoSwitch: sq.autoSwitch,
            allowAiSwitch: sq.allowAiSwitch,
            options: sq.options ? (sq.options as any) : undefined,
            correctOption: sq.correctOption ?? null,
            explanation: sq.explanation || null,
            promptText: sq.promptText,
            expectedRubric: sq.expectedRubric,
            secondaryProbe: sq.secondaryProbe || null,
            maxProbes: sq.maxProbes,
            isActive: sq.isActive,
          },
        });
      }
    } else if (copyQuestionsFromRoleId) {
      const sourceQuestions = await prisma.interviewQuestion.findMany({
        where: { jobRoleId: copyQuestionsFromRoleId },
        orderBy: { order: "asc" },
      });

      for (let i = 0; i < sourceQuestions.length; i++) {
        const sq = sourceQuestions[i];
        await prisma.interviewQuestion.create({
          data: {
            jobRoleId: role.id,
            order: i + 1,
            title: sq.title,
            stage: sq.stage,
            category: sq.category,
            durationMinutes: sq.durationMinutes,
            autoSwitch: sq.autoSwitch,
            allowAiSwitch: sq.allowAiSwitch,
            options: sq.options ?? undefined,
            correctOption: sq.correctOption,
            explanation: sq.explanation,
            promptText: sq.promptText,
            audioUrl: sq.audioUrl,
            audioSource: sq.audioSource,
            expectedRubric: sq.expectedRubric ?? undefined,
            secondaryProbe: sq.secondaryProbe,
            maxProbes: sq.maxProbes,
            evaluationType: sq.evaluationType,
            skillTags: sq.skillTags ?? undefined,
            isActive: sq.isActive,
          },
        });
      }
    }

    return NextResponse.json({ role }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating job role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create job role" },
      { status: 500 }
    );
  }
}
