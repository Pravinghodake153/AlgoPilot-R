import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";

/**
 * GET /api/admin/notifications
 * Fetches all admin audit notifications from the last 10 days.
 * Strictly read-only to preserve the audit trail.
 */
export async function GET() {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 10 days retention filter
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const notifications = await prisma.adminNotification.findMany({
      where: {
        createdAt: {
          gte: tenDaysAgo,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/notifications
 * Creates an immutable audit notification entry.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type = "info", title, message, action } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const validTypes = ["success", "error", "info", "warning"];
    const sanitizedType = validTypes.includes(type) ? type : "info";

    const notification = await prisma.adminNotification.create({
      data: {
        type: sanitizedType,
        title,
        message,
        action: action || null,
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Error creating admin notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/notifications
 * Explicitly forbidden to protect the 10-day audit integrity.
 */
export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Forbidden: Admin notification logs are protected by audit policy and cannot be deleted.",
    },
    { status: 403 }
  );
}
