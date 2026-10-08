import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";
import fs from "fs/promises";
import path from "path";

/**
 * POST /api/admin/questions/upload-voice
 * Uploads a custom pre-recorded audio file for a question.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const questionId = formData.get("questionId") as string | null;
    const file = formData.get("file") as File | null;

    if (!questionId || !file) {
      return NextResponse.json(
        { error: "questionId and audio file are required" },
        { status: 400 }
      );
    }

    const audioDir = path.join(process.cwd(), "public", "audio", "questions");
    await fs.mkdir(audioDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop() || "mp3";
    const fileName = `${questionId}.${ext}`;
    const filePath = path.join(audioDir, fileName);

    await fs.writeFile(filePath, buffer);

    const audioUrl = `/audio/questions/${fileName}?t=${Date.now()}`;

    await prisma.interviewQuestion.update({
      where: { id: questionId },
      data: {
        audioUrl,
        audioSource: "uploaded",
      },
    });

    return NextResponse.json({
      success: true,
      audioUrl,
    });
  } catch (error: unknown) {
    console.error("Error uploading question audio:", error);
    const message = error instanceof Error ? error.message : "Failed to upload audio";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
