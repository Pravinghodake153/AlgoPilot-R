import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateAnswerRubric } from "@/services/ai-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params;
    const body = await req.json();
    const { questionId, candidateAnswer, retryCount = 0 } = body;

    if (!questionId || !candidateAnswer) {
      return NextResponse.json(
        { error: "questionId and candidateAnswer are required" },
        { status: 400 }
      );
    }

    // Get current question
    const question = await prisma.interviewQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const expectedRubric = (question.expectedRubric as string[]) || [];
    const isRetry = retryCount > 0;

    // Run evaluation
    const evaluation = await evaluateAnswerRubric({
      questionTitle: question.title,
      questionPrompt: question.promptText,
      expectedRubric,
      secondaryProbe: question.secondaryProbe,
      candidateAnswer,
      isRetry,
      category: question.category,
      options: (question.options as string[]) || null,
      correctOption: question.correctOption,
    });

    // Check if should advance
    const shouldAdvance = evaluation.isSatisfactory || retryCount >= question.maxProbes;

    // Save step evaluation in DB
    try {
      await prisma.stepEvaluation.create({
        data: {
          interviewId,
          questionId,
          candidateTranscript: candidateAnswer,
          matchedConcepts: evaluation.matchedConcepts,
          missedConcepts: evaluation.missedConcepts,
          probeCount: retryCount,
          score: evaluation.score,
          feedback: evaluation.spokenFeedback,
        },
      });
    } catch (dbErr) {
      console.warn("Failed to save step evaluation to DB:", dbErr);
    }

    // Find next question if advancing
    let nextQuestion = null;
    if (shouldAdvance) {
      nextQuestion = await prisma.interviewQuestion.findFirst({
        where: {
          order: { gt: question.order },
          isActive: true,
        },
        orderBy: { order: "asc" },
      });
    }

    return NextResponse.json({
      isSatisfactory: evaluation.isSatisfactory,
      spokenFeedback: evaluation.spokenFeedback,
      shouldAdvance,
      nextQuestion,
      matchedConcepts: evaluation.matchedConcepts,
      missedConcepts: evaluation.missedConcepts,
      score: evaluation.score,
    });
  } catch (error: any) {
    console.error("Step evaluation route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to evaluate step" },
      { status: 500 }
    );
  }
}
