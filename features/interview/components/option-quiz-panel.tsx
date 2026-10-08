"use client";

import React, { useState } from "react";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronRight,
  Send,
  Info,
  Layers,
} from "lucide-react";

interface OptionQuizPanelProps {
  onOptionSelected?: (selectedIdx: number, selectedText: string) => void;
  onNextCategory?: () => void;
}

export function OptionQuizPanel({
  onOptionSelected,
  onNextCategory,
}: OptionQuizPanelProps) {
  const currentQuestion = useInterviewStore((s) => s.currentQuestion);
  const currentQuestionIndex = useInterviewStore((s) => s.currentQuestionIndex);
  const questionsList = useInterviewStore((s) => s.questionsList);
  const categoryTimeRemainingSeconds = useInterviewStore((s) => s.categoryTimeRemainingSeconds);
  const selectedOptionIndex = useInterviewStore((s) => s.selectedOptionIndex);
  const setSelectedOptionIndex = useInterviewStore((s) => s.setSelectedOptionIndex);
  const quizSubmitted = useInterviewStore((s) => s.quizSubmitted);
  const setQuizSubmitted = useInterviewStore((s) => s.setQuizSubmitted);

  const rawOptions = currentQuestion?.options;
  const options: string[] = Array.isArray(rawOptions)
    ? rawOptions
    : [
        "Optimal time complexity O(n) using a Hash Map",
        "Brute-force nested loops with O(n²) time complexity",
        "Sorting array first with O(n log n) and two pointers",
        "Dynamic programming tabulation table",
      ];

  const correctOption: number | null =
    typeof currentQuestion?.correctOption === "number" ? currentQuestion.correctOption : null;

  const OPTION_LETTERS = ["A", "B", "C", "D"];

  const formatTimer = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const rem = Math.max(0, secs) % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (idx: number) => {
    if (quizSubmitted) return;
    setSelectedOptionIndex(idx);
  };

  const handleSubmit = () => {
    if (selectedOptionIndex === null) return;
    setQuizSubmitted(true);
    if (onOptionSelected) {
      onOptionSelected(selectedOptionIndex, options[selectedOptionIndex]);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-gradient-to-b from-card/70 via-background to-background p-6">
      {/* Top Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                Stage {currentQuestionIndex + 1} of {Math.max(1, questionsList.length)}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400">
                Multiple-Choice Quiz
              </span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {currentQuestion?.title || "Option-Based Conceptual Question"}
            </h1>
          </div>
        </div>

        {/* Phase Countdown & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-secondary/40 px-3 py-1.5 backdrop-blur-sm">
            <Clock className="h-4 w-4 text-purple-400 animate-pulse" />
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
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
            >
              <span>Continue</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Question & Options Container */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
        {/* Question Prompt Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-3">
            <Sparkles className="h-4 w-4" />
            <span>Question Statement</span>
          </div>
          <p className="text-base sm:text-lg leading-relaxed text-foreground font-semibold">
            {currentQuestion?.promptText ||
              "Which of the following approaches achieves the optimal time complexity for this problem?"}
          </p>
        </div>

        {/* 4 Options Grid (A, B, C, D) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {options.slice(0, 4).map((optionText, idx) => {
            const letter = OPTION_LETTERS[idx];
            const isSelected = selectedOptionIndex === idx;
            const isCorrect = correctOption !== null && correctOption === idx;
            const isWrongSelected = quizSubmitted && isSelected && correctOption !== null && !isCorrect;

            let cardStyles =
              "border-border/80 bg-card/40 hover:bg-card/70 hover:border-purple-500/50 cursor-pointer";

            if (isSelected && !quizSubmitted) {
              cardStyles = "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30";
            } else if (quizSubmitted) {
              if (isCorrect) {
                cardStyles = "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30";
              } else if (isWrongSelected) {
                cardStyles = "border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30";
              } else {
                cardStyles = "border-border/40 bg-card/20 opacity-60";
              }
            }

            return (
              <div
                key={idx}
                onClick={() => handleSelectOption(idx)}
                className={`relative flex items-center gap-4 rounded-xl border p-4.5 transition-all duration-200 select-none ${cardStyles}`}
              >
                {/* Letter Badge */}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold transition-colors ${
                    isSelected && !quizSubmitted
                      ? "bg-purple-600 text-white"
                      : quizSubmitted && isCorrect
                      ? "bg-emerald-600 text-white"
                      : quizSubmitted && isWrongSelected
                      ? "bg-rose-600 text-white"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {letter}
                </div>

                {/* Option Text */}
                <div className="flex-1 text-sm font-medium text-foreground leading-snug">
                  {optionText}
                </div>

                {/* Selection Indicator */}
                <div className="shrink-0">
                  {quizSubmitted ? (
                    isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : isWrongSelected ? (
                      <XCircle className="h-5 w-5 text-rose-400" />
                    ) : null
                  ) : isSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-purple-400" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-border/80" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Controls & Feedback */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>
              {quizSubmitted
                ? "Answer submitted! Review the details or continue to the next stage."
                : "Select the best answer and click Submit to record your response."}
            </span>
          </div>

          {!quizSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOptionIndex === null}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span>Submit Answer</span>
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Response recorded</span>
            </div>
          )}
        </div>

        {/* Explanation Card (if submitted and explanation is available) */}
        {quizSubmitted && currentQuestion?.explanation && (
          <div className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground mb-1">
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Concept Explanation</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">{currentQuestion.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
