"use client";

import React from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import {
  MessageSquare,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Mic,
  Volume2,
  CheckCircle2,
  Layers,
  ChevronRight,
} from "lucide-react";

interface ConversationRoomViewProps {
  onNextCategory?: () => void;
}

export function ConversationRoomView({ onNextCategory }: ConversationRoomViewProps) {
  const currentQuestion = useInterviewStore((s) => s.currentQuestion);
  const currentQuestionIndex = useInterviewStore((s) => s.currentQuestionIndex);
  const questionsList = useInterviewStore((s) => s.questionsList);
  const aiState = useInterviewStore((s) => s.aiState);
  const problemTitle = useInterviewStore((s) => s.problemTitle);
  const categoryTimeRemainingSeconds = useInterviewStore((s) => s.categoryTimeRemainingSeconds);
  const isMicMuted = useInterviewStore((s) => s.isMicMuted);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const rem = Math.max(0, secs) % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const expectedRubric = (currentQuestion?.expectedRubric as string[]) || [];

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-card/80 via-background to-background p-6">
      {/* Stage Header Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Stage {currentQuestionIndex + 1} of {Math.max(1, questionsList.length)}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Conversation & Intro
              </span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {currentQuestion?.title || "Welcome & Initial Discussion"}
            </h1>
          </div>
        </div>

        {/* Phase Countdown & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-secondary/40 px-3 py-1.5 backdrop-blur-sm">
            <Clock className="h-4 w-4 text-primary animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-medium">Stage Timer</span>
              <span className="font-mono text-sm font-bold text-foreground">
                {formatTimer(categoryTimeRemainingSeconds)}
              </span>
            </div>
          </div>

          {onNextCategory && (
            <button
              onClick={onNextCategory}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Conversational Showcase */}
      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: AI Stage & Interactive Card */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          {/* Active Question Prompt Card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-md">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-3">
              <Sparkles className="h-4 w-4" />
              <span>Interviewer Question</span>
            </div>
            <p className="text-base sm:text-lg leading-relaxed text-foreground font-medium">
              {currentQuestion?.promptText ||
                "Welcome to your interview. Please introduce yourself and walk me through your initial understanding of the challenge."}
            </p>

            {problemTitle && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/30 border border-border/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Topic Problem:</span>
                <span>{problemTitle}</span>
              </div>
            )}
          </div>

          {/* Discussion Tips / Expected Rubric Focus */}
          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
              <Layers className="h-4 w-4 text-primary" />
              <span>Key Discussion Aspects</span>
            </div>
            {expectedRubric.length > 0 ? (
              <div className="space-y-2.5">
                {expectedRubric.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/40 p-2.5 text-xs text-foreground/90"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Explain your background or relevant experience clearly.</p>
                <p>• State any assumptions or clarifications before jumping into technical solutions.</p>
                <p>• Speak naturally — the AI interviewer evaluates clarity, structure, and depth.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Visualizer & Candidate Status */}
        <div className="flex flex-col gap-5 lg:col-span-5">
          {/* AI Presence Visualizer Box */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/60 p-6 text-center backdrop-blur-md">
            <div className="relative mb-4 flex h-24 w-24 items-center justify-center">
              {/* Outer Pulsing Rings */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-700 ${
                  aiState === "speaking"
                    ? "bg-primary/20 scale-125 animate-ping"
                    : aiState === "thinking"
                    ? "bg-amber-500/20 scale-110 animate-pulse"
                    : aiState === "listening"
                    ? "bg-emerald-500/20 scale-115 animate-pulse"
                    : "bg-secondary scale-100"
                }`}
              />
              {/* Middle Ring */}
              <div
                className={`absolute inset-2 rounded-full border transition-colors ${
                  aiState === "speaking"
                    ? "border-primary/60 bg-primary/10"
                    : aiState === "thinking"
                    ? "border-amber-500/60 bg-amber-500/10"
                    : aiState === "listening"
                    ? "border-emerald-500/60 bg-emerald-500/10"
                    : "border-border bg-card"
                }`}
              />
              {/* Center Core */}
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-inner">
                {aiState === "speaking" ? (
                  <Volume2 className="h-6 w-6 text-primary animate-bounce" />
                ) : aiState === "listening" ? (
                  <Mic className="h-6 w-6 text-emerald-400" />
                ) : aiState === "thinking" ? (
                  <Sparkles className="h-6 w-6 text-amber-400 animate-spin" />
                ) : (
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </div>

            <h2 className="text-sm font-semibold text-foreground">
              {aiState === "speaking"
                ? "AI Interviewer Speaking..."
                : aiState === "listening"
                ? "AI Interviewer Listening..."
                : aiState === "thinking"
                ? "Evaluating Your Response..."
                : "AI Interviewer Ready"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isMicMuted
                ? "Your microphone is currently muted. Unmute to speak."
                : "Speak directly into your mic or use the text box on the right."}
            </p>
          </div>

          {/* Quick Notice Card */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-foreground">Continuous Stage Progression</span>
                <p className="text-muted-foreground leading-relaxed">
                  When this introductory conversation completes, the interface will automatically switch to the next stage
                  configured by the administrator (e.g., Code Editor, Whiteboard, or Quiz).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
