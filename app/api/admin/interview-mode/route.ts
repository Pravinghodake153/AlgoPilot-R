import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
      mode: modeSetting?.value || "hybrid",
      hybridVoice: voiceSetting?.value || "af_heart",
      interviewerSkill: interviewerSkillSetting?.value || "startup_pragmatist",
      evaluatorSkill: evaluatorSkillSetting?.value || "executive_committee",
      targetSkills: targetSkillsSetting?.value || "System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership",
    });
  } catch (error) {
    console.error("Error fetching interview mode:", error);
    return NextResponse.json({ error: "Failed to fetch mode" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { mode, hybridVoice, interviewerSkill, evaluatorSkill, targetSkills } = body;

    if (mode && ["hybrid", "dynamic"].includes(mode)) {
      await prisma.systemSetting.upsert({
        where: { key: "INTERVIEW_MODE" },
        update: { value: mode },
        create: { key: "INTERVIEW_MODE", value: mode },
      });
    }

    if (hybridVoice) {
      await prisma.systemSetting.upsert({
        where: { key: "HYBRID_TTS_VOICE" },
        update: { value: hybridVoice },
        create: { key: "HYBRID_TTS_VOICE", value: hybridVoice },
      });
    }

    if (interviewerSkill) {
      await prisma.systemSetting.upsert({
        where: { key: "DYNAMIC_INTERVIEWER_SKILL" },
        update: { value: interviewerSkill },
        create: { key: "DYNAMIC_INTERVIEWER_SKILL", value: interviewerSkill },
      });
    }

    if (evaluatorSkill) {
      await prisma.systemSetting.upsert({
        where: { key: "DYNAMIC_EVALUATOR_SKILL" },
        update: { value: evaluatorSkill },
        create: { key: "DYNAMIC_EVALUATOR_SKILL", value: evaluatorSkill },
      });
    }

    if (targetSkills !== undefined) {
      await prisma.systemSetting.upsert({
        where: { key: "DYNAMIC_TARGET_SKILLS" },
        update: { value: targetSkills },
        create: { key: "DYNAMIC_TARGET_SKILLS", value: targetSkills },
      });
    }

    return NextResponse.json({
      success: true,
      mode,
      hybridVoice,
      interviewerSkill,
      evaluatorSkill,
      targetSkills,
    });
  } catch (error) {
    console.error("Error setting interview mode:", error);
    return NextResponse.json({ error: "Failed to update interview mode" }, { status: 500 });
  }
}
