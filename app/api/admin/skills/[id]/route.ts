import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/skills/[id]
 */
export async function GET(req: Request, { params }: RouteParams) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const skill = await prisma.aiSkill.findUnique({
      where: { id },
    });

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    return NextResponse.json({ skill });
  } catch (error) {
    console.error("Error fetching AI skill:", error);
    return NextResponse.json({ error: "Failed to fetch skill" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/skills/[id]
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, category, description, badge, content, files, isActive } = body;

    const existing = await prisma.aiSkill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const updated = await prisma.aiSkill.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(badge !== undefined && { badge: badge?.trim() || "Custom" }),
        ...(content !== undefined && { content: content.trim() }),
        ...(files !== undefined && { files: Array.isArray(files) ? files : undefined }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({ skill: updated });
  } catch (error: any) {
    console.error("Error updating AI skill:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update skill" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/skills/[id]
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const existing = await prisma.aiSkill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    if (existing.isBuiltIn) {
      return NextResponse.json(
        { error: "Built-in template skills cannot be deleted. You can deactivate them instead." },
        { status: 400 }
      );
    }

    // Check if any JobRole is currently using this skill
    const dependentRole = await prisma.jobRole.findFirst({
      where: {
        OR: [
          { interviewerSkill: existing.slug },
          { evaluatorSkill: existing.slug },
        ],
      },
      select: { title: true },
    });

    if (dependentRole) {
      return NextResponse.json(
        {
          error: `Cannot delete skill because it is assigned to job role "${dependentRole.title}". Please reassign the job role first.`,
        },
        { status: 400 }
      );
    }

    await prisma.aiSkill.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Skill deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting AI skill:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete skill" },
      { status: 500 }
    );
  }
}
