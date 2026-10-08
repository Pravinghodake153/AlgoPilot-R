import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";
import { INTERVIEWER_SKILLS, REPORT_EVALUATOR_SKILLS } from "@/types/skills";

const BUILT_IN_ADMIN_SKILLS = [
  ...Object.values(INTERVIEWER_SKILLS).map((s) => ({
    id: `skill-${s.id}`,
    name: s.name,
    slug: s.id,
    type: "interviewer" as const,
    category: s.badge || "Engineering",
    description: s.description,
    badge: s.badge,
    content: s.promptInstructions,
    files: null,
    isBuiltIn: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  ...Object.values(REPORT_EVALUATOR_SKILLS).map((s) => ({
    id: `skill-${s.id}`,
    name: s.name,
    slug: s.id,
    type: "evaluator" as const,
    category: s.badge || "Evaluation",
    description: s.description,
    badge: s.badge,
    content: s.evaluationPhilosophy,
    files: null,
    isBuiltIn: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
];

/**
 * GET /api/admin/skills
 * Lists all AI Skills (Interviewer & Evaluator).
 * Supports optional ?type=interviewer | evaluator filter.
 * Merges built-in skills with custom database skills.
 */
export async function GET(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");

    let dbSkills: any[] = [];
    try {
      dbSkills = await prisma.aiSkill.findMany({
        where: {
          ...(typeFilter ? { type: typeFilter } : {}),
        },
        orderBy: [{ isBuiltIn: "desc" }, { createdAt: "desc" }],
      });
    } catch (dbErr) {
      console.warn("Could not query AiSkill from DB in admin route, falling back to built-in skills:", dbErr);
    }

    const dbSkillMap = new Map<string, any>();
    dbSkills.forEach((s) => dbSkillMap.set(s.slug, s));

    // Combine built-in with DB overrides
    const combinedBuiltIn = BUILT_IN_ADMIN_SKILLS.filter(
      (s) => !typeFilter || s.type === typeFilter
    ).map((builtIn) => dbSkillMap.get(builtIn.slug) || builtIn);

    // Add custom skills that are not in built-in
    const customDbSkills = dbSkills.filter(
      (s) => !INTERVIEWER_SKILLS[s.slug] && !REPORT_EVALUATOR_SKILLS[s.slug]
    );

    const allSkills = [...customDbSkills, ...combinedBuiltIn];

    return NextResponse.json({ skills: allSkills });
  } catch (error) {
    console.error("Error fetching AI skills:", error);
    return NextResponse.json({ error: "Failed to fetch AI skills" }, { status: 500 });
  }
}

/**
 * POST /api/admin/skills
 * Creates a new custom AI Skill (single markdown or folder of markdown files).
 */
export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      name,
      slug: customSlug,
      type,
      category = "General",
      description = "",
      badge = "Custom",
      content,
      files,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Skill name is required" }, { status: 400 });
    }

    if (!type || (type !== "interviewer" && type !== "evaluator")) {
      return NextResponse.json(
        { error: "Invalid skill type. Must be 'interviewer' or 'evaluator'" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Skill markdown content is required" },
        { status: 400 }
      );
    }

    // Safety limit: 500KB markdown content max
    if (content.length > 500000) {
      return NextResponse.json(
        { error: "Skill markdown exceeds 500KB maximum size" },
        { status: 400 }
      );
    }

    let finalSlug =
      customSlug && typeof customSlug === "string" && customSlug.trim()
        ? customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_")
        : name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 50);

    // Ensure uniqueness
    const existing = await prisma.aiSkill.findUnique({
      where: { slug: finalSlug },
    });
    if (existing) {
      finalSlug = `${finalSlug}_${Date.now().toString(36)}`;
    }

    const skill = await prisma.aiSkill.create({
      data: {
        name: name.trim(),
        slug: finalSlug,
        type,
        category: category?.trim() || "General",
        description: description?.trim() || null,
        badge: badge?.trim() || "Custom",
        content: content.trim(),
        files: Array.isArray(files) ? files : undefined,
        isBuiltIn: false,
        isActive: true,
      },
    });

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating AI skill:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create AI skill" },
      { status: 500 }
    );
  }
}
