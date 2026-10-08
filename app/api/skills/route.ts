import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INTERVIEWER_SKILLS, REPORT_EVALUATOR_SKILLS } from "@/types/skills";

const BUILT_IN_INTERVIEWER_SKILLS = Object.values(INTERVIEWER_SKILLS).map((s) => ({
  id: `skill-${s.id}`,
  name: s.name,
  slug: s.id,
  type: "interviewer" as const,
  category: s.badge || "Engineering",
  description: s.description,
  badge: s.badge,
  isBuiltIn: true,
}));

const BUILT_IN_EVALUATOR_SKILLS = Object.values(REPORT_EVALUATOR_SKILLS).map((s) => ({
  id: `skill-${s.id}`,
  name: s.name,
  slug: s.id,
  type: "evaluator" as const,
  category: s.badge || "Evaluation",
  description: s.description,
  badge: s.badge,
  isBuiltIn: true,
}));

/**
 * GET /api/skills
 * Returns active skills categorized by type (interviewer & evaluator)
 * for use in Job Role configuration and Studio dropdowns.
 * Merges built-in fallback skills with custom database skills.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");

    let dbSkills: any[] = [];
    try {
      dbSkills = await prisma.aiSkill.findMany({
        where: {
          isActive: true,
          ...(typeFilter ? { type: typeFilter } : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          category: true,
          description: true,
          badge: true,
          isBuiltIn: true,
        },
        orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
      });
    } catch (dbErr) {
      console.warn("Could not query AiSkill table from DB, falling back to built-in skills:", dbErr);
    }

    // Index DB skills by slug
    const dbSkillMap = new Map<string, any>();
    dbSkills.forEach((s) => dbSkillMap.set(s.slug, s));

    // Combine built-in with DB (DB overrides built-in if updated, otherwise built-in provided)
    const combinedInterviewers = BUILT_IN_INTERVIEWER_SKILLS.map((builtIn) =>
      dbSkillMap.get(builtIn.slug) || builtIn
    );
    const combinedEvaluators = BUILT_IN_EVALUATOR_SKILLS.map((builtIn) =>
      dbSkillMap.get(builtIn.slug) || builtIn
    );

    // Append any purely custom skills from DB that aren't in built-in
    dbSkills.forEach((s) => {
      if (s.type === "interviewer" && !INTERVIEWER_SKILLS[s.slug]) {
        combinedInterviewers.push(s);
      } else if (s.type === "evaluator" && !REPORT_EVALUATOR_SKILLS[s.slug]) {
        combinedEvaluators.push(s);
      }
    });

    const filteredInterviewers =
      typeFilter === "evaluator" ? [] : combinedInterviewers;
    const filteredEvaluators =
      typeFilter === "interviewer" ? [] : combinedEvaluators;
    const allSkills = [...filteredInterviewers, ...filteredEvaluators];

    return NextResponse.json({
      skills: allSkills,
      interviewers: filteredInterviewers,
      evaluators: filteredEvaluators,
    });
  } catch (error) {
    console.error("Error fetching public skills list:", error);
    return NextResponse.json({ error: "Failed to fetch skills list" }, { status: 500 });
  }
}

