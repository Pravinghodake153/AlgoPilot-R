import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, context: RouteContext) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Unset any previous default
    await prisma.jobRole.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Set this role as default
    const updated = await prisma.jobRole.update({
      where: { id },
      data: { isDefault: true },
    });

    return NextResponse.json({ success: true, role: updated });
  } catch (error: any) {
    console.error("Error setting default role:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set default role" },
      { status: 500 }
    );
  }
}
