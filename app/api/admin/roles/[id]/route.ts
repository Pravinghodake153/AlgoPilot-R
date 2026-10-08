import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/roles/[id]
 */
export async function GET(req: Request, context: RouteContext) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const role = await prisma.jobRole.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: { interviews: true },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: "Job Role not found" }, { status: 404 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error fetching job role:", error);
    return NextResponse.json({ error: "Failed to fetch job role" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/roles/[id]
 */
export async function PATCH(req: Request, context: RouteContext) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await req.json();
    const {
      title,
      description,
      department,
      level,
      mode,
      hybridVoice,
      interviewerSkill,
      evaluatorSkill,
      targetSkills,
      isDefault,
      isActive,
    } = body;

    // If setting as default, unset others
    if (isDefault) {
      await prisma.jobRole.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.jobRole.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(department !== undefined && { department: department?.trim() || "Engineering" }),
        ...(level !== undefined && { level: level?.trim() || "Mid-Level" }),
        ...(mode !== undefined && { mode }),
        ...(hybridVoice !== undefined && { hybridVoice }),
        ...(interviewerSkill !== undefined && { interviewerSkill }),
        ...(evaluatorSkill !== undefined && { evaluatorSkill }),
        ...(targetSkills !== undefined && { targetSkills }),
        ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json({ role: updated });
  } catch (error: any) {
    console.error("Error updating job role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update job role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/roles/[id]
 */
export async function DELETE(req: Request, context: RouteContext) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await prisma.jobRole.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting job role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete job role" },
      { status: 500 }
    );
  }
}
