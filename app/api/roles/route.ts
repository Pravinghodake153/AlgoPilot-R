import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/roles
 * Public endpoint for candidates: fetches active job roles to choose from when starting an interview.
 */
export async function GET() {
  try {
    const roles = await prisma.jobRole.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        department: true,
        level: true,
        mode: true,
        targetSkills: true,
        isDefault: true,
        _count: {
          select: { questions: true },
        },
      },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Error fetching public roles:", error);
    return NextResponse.json({ roles: [] });
  }
}
