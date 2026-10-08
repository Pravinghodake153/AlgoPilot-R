import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/admin-auth";
import fs from "fs/promises";
import path from "path";

/**
 * POST /api/admin/questions/generate-voice
 * Generates an MP3 audio file for a question's prompt text using TTS,
 * saves it into public/audio/questions/[questionId].mp3,
 * and attaches the audioUrl to the question in the database.
 */
export async function POST(req: Request) {
  if (!(await authorizeAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { questionId, text, voice = "af_heart" } = body;

    if (!questionId || !text) {
      return NextResponse.json(
        { error: "questionId and text are required" },
        { status: 400 }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return NextResponse.json(
        {
          error:
            "OPENROUTER_API_KEY is not configured in .env.local. Please configure your key to generate audio voices.",
        },
        { status: 500 }
      );
    }

    // Determine model based on voice prefix
    let targetModel = process.env.OPENROUTER_TTS_MODEL || "hexgrad/kokoro-82m";
    let targetVoice = voice;

    if (voice.startsWith("minimax_")) {
      targetModel = "minimax/speech-01";
      targetVoice = voice === "minimax_male_presenter" ? "presenter_male" : "female-shaonv";
    } else if (voice.startsWith("gemini_")) {
      targetModel = "openai/tts-1";
      targetVoice = voice.replace("gemini_", "");
    }

    // Sanitize text for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[*`_#]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Call OpenRouter TTS API
    const ttsResponse = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: targetModel,
        input: cleanText,
        voice: targetVoice,
        response_format: "mp3",
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("OpenRouter TTS generation failed:", ttsResponse.status, errorText);
      return NextResponse.json(
        { error: `TTS synthesis failed (${ttsResponse.status}): ${errorText}` },
        { status: ttsResponse.status }
      );
    }

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    // Ensure target folder exists
    const audioDir = path.join(process.cwd(), "public", "audio", "questions");
    await fs.mkdir(audioDir, { recursive: true });

    // Save audio file as questionId.mp3
    const fileName = `${questionId}.mp3`;
    const filePath = path.join(audioDir, fileName);
    await fs.writeFile(filePath, audioBuffer);

    const audioUrl = `/audio/questions/${fileName}?t=${Date.now()}`;

    // Update database record
    await prisma.interviewQuestion.update({
      where: { id: questionId },
      data: {
        audioUrl,
        audioSource: "generated",
      },
    });

    return NextResponse.json({
      success: true,
      audioUrl,
    });
  } catch (error: unknown) {
    console.error("Error generating question audio:", error);
    const message = error instanceof Error ? error.message : "Failed to generate audio";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
