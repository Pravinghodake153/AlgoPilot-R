"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getScoreColor } from "@/lib/utils";
import { FeedbackButton } from "@/features/feedback/components/feedback-button";
import { MessageContent } from "@/features/interview/components/message-content";
import { ThemeToggle } from "@/components/theme-toggle";

import {
  Award,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Compass,
  Target,
  Quote,
  UserCheck,
  BookOpen,
  ChevronRight,
  Layers,
} from "lucide-react";

// ─── Staged Report Progress ─────────────────

const REPORT_STAGES = [
  { label: "Analyzing transcript", duration: 3000 },
  { label: "Evaluating code quality", duration: 3000 },
  { label: "Scoring communication", duration: 3000 },
  { label: "Generating recommendations", duration: 3000 },
  { label: "Finalizing report", duration: 6000 },
];

function ReportProgress() {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    if (currentStage >= REPORT_STAGES.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStage((s) => Math.min(s + 1, REPORT_STAGES.length - 1));
    }, REPORT_STAGES[currentStage].duration);

    return () => clearTimeout(timer);
  }, [currentStage]);

  const progress = ((currentStage + 1) / REPORT_STAGES.length) * 100;

  return (
    <div className="mt-10 flex flex-col items-center justify-center py-16">
      {/* Spinner */}
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-foreground" />

      {/* Stage label */}
      <p className="mt-4 text-sm text-foreground font-medium">
        {REPORT_STAGES[currentStage].label}...
      </p>

      {/* Progress bar */}
      <div className="mt-4 w-64 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground/60 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="mt-4 flex flex-col gap-1.5">
        {REPORT_STAGES.map((stage, i) => (
          <div key={stage.label} className="flex items-center gap-2 text-xs">
            {i < currentStage ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : i === currentStage ? (
              <span className="h-3 w-3 rounded-full border-2 border-foreground/60 animate-pulse" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-muted-foreground/30" />
            )}
            <span
              className={
                i < currentStage
                  ? "text-emerald-400"
                  : i === currentStage
                    ? "text-foreground"
                    : "text-muted-foreground/40"
              }
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ReportData {
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  optimizationScore: number;
  codeQualityScore: number;
  recruiterVerdict?: string | null;
  recruiterNotes?: {
    executiveSummary?: string;
    hiringRecommendation?: string;
    keyQuotes?: { topic: string; quote: string; analysis: string }[];
  } | null;
  skillScores?: Record<string, number> | null;
  candidateRoadmap?: {
    step: number;
    title: string;
    description: string;
    practiceAdvice: string;
  }[] | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
  nextSteps?: string[];
  transcriptAnnotations?: { messageIndex: number; tag: string; rationale: string }[];
  timeComplexity?: string;
  spaceComplexity?: string;
  isSolved?: boolean;
  estimatedLevel?: string;
}

interface ReportClientProps {
  interview: {
    id: string;
    problemTitle: string;
    difficulty: string;
    language: string;
    duration: number;
    code: string;
    style: string;
    createdAt: string;
  };
  report: ReportData | null;
  messageCount: number;
  messages?: { role: string; content: string; createdAt: Date }[];
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  go: "Go",
};

/**
 * Report page client component.
 * Shows scores, strengths, weaknesses, suggestions, and summary.
 * Triggers report generation if not yet generated.
 */
export function ReportClient({
  interview,
  report: initialReport,
  messageCount,
  messages = [],
}: ReportClientProps) {
  const [report, setReport] = useState<ReportData | null>(initialReport);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Auto-generate report if not present
  useEffect(() => {
    if (!report && !isGenerating) {
      generateReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateReport(force = false) {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/interviews/${interview.id}/report${force ? "?force=true" : ""}`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate report");
      }

      const data = await res.json();
      setReport(data.report);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate report. Please try again.";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShowShareTooltip(true);
    setTimeout(() => setShowShareTooltip(false), 2000);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Interview Report
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{interview.problemTitle}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{LANGUAGE_LABELS[interview.language] ?? interview.language}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="capitalize">{interview.difficulty}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{messageCount} messages</span>
          </div>
        </div>
        
        {/* Share Button & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <div className="relative">
            <button 
              onClick={handleShare}
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Share Score
            </button>
            {showShareTooltip && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-foreground px-2 py-1 text-xs text-background shadow-md">
                Link Copied!
              </div>
            )}
          </div>
        </div>
      </div>

      <FeedbackButton />

      {/* Loading state — staged progress */}
      {isGenerating && <ReportProgress />}

      {/* Error state */}
      {error && (
        <div className="mt-10 flex flex-col items-center gap-3 py-16">
          <p className="text-sm text-red-400 font-medium">{error}</p>
          <button
            onClick={() => generateReport(true)}
            className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-foreground hover:bg-secondary/80 cursor-pointer"
          >
            Retry Generation
          </button>
        </div>
      )}

      {/* Report content */}
      {report && (
        <div className="mt-8 flex flex-col gap-8">
          
          {/* Failure Alert Banner */}
          {report.weaknesses?.some(w => w.startsWith("Report generation error:")) && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              <div className="flex items-start gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-sm text-red-300">Report Generation Failed</h3>
                  <p className="text-xs text-red-200/90 font-mono bg-black/30 p-2 rounded border border-red-500/20 break-all">
                    {report.weaknesses.find(w => w.startsWith("Report generation error:"))}
                  </p>
                  <p className="text-xs text-red-300/80 mt-1">
                    Please check your AI Provider / API Key settings in the Admin Dashboard, then click the <strong>Regenerate (⟳)</strong> button at the bottom of this page.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Advanced Metrics / Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col rounded-xl border border-border p-4 bg-card">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</span>
              <div className="flex items-center gap-2">
                {report.isSolved ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span className="font-semibold text-emerald-500">Solved</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <span className="font-semibold text-amber-500">Not Solved</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col rounded-xl border border-border p-4 bg-card">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Estimated Level</span>
              <span className="font-semibold text-primary">{report.estimatedLevel || "Unknown"}</span>
            </div>

            <div className="flex flex-col rounded-xl border border-border p-4 bg-card">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Interview Style</span>
              <span className="font-semibold text-primary capitalize">{interview.style || "Standard"}</span>
            </div>
          </div>

          {/* Executive Recruiter Card (Skill 2 Dynamic Evaluation) */}
          {(report.recruiterVerdict || report.recruiterNotes || report.skillScores) && (
            <div className="rounded-xl border border-primary/30 bg-card p-6 shadow-sm space-y-6">
              {/* Verdict Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Skill 2 &bull; Executive Lens
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      HR & Recruiter Decision Matrix
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    Executive Hiring Verdict & Candidate Assessment
                  </h2>
                </div>

                {/* Verdict Badge */}
                {(() => {
                  const verdict = report.recruiterVerdict || "HIRE";
                  let badgeStyles = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
                  let label = "Hire";
                  let Icon = CheckCircle2;

                  if (verdict === "STRONG_HIRE") {
                    badgeStyles = "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30";
                    label = "Strong Hire";
                    Icon = Award;
                  } else if (verdict === "LEANING_NO") {
                    badgeStyles = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
                    label = "Leaning No";
                    Icon = AlertCircle;
                  } else if (verdict === "NO_HIRE") {
                    badgeStyles = "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
                    label = "Do Not Hire";
                    Icon = XCircle;
                  }

                  return (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-bold text-sm tracking-wide ${badgeStyles}`}>
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </div>
                  );
                })()}
              </div>

              {/* Executive Summary & Placement Recommendation */}
              {report.recruiterNotes && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {report.recruiterNotes.executiveSummary && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-1.5">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-primary" />
                        Executive Summary
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {report.recruiterNotes.executiveSummary}
                      </p>
                    </div>
                  )}
                  {report.recruiterNotes.hiringRecommendation && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-1.5">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Leveling & Placement Recommendation
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {report.recruiterNotes.hiringRecommendation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Target Skill Matches (Scorecard) */}
              {report.skillScores && Object.keys(report.skillScores).length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Target Competency Scorecard
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(report.skillScores).map(([skillName, score]) => (
                      <div key={skillName} className="p-3 rounded-lg border border-border bg-card space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-foreground">{skillName}</span>
                          <span className={`font-bold tabular-nums ${getScoreColor(score)}`}>
                            {score}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verbatim Subjective Quotes & Career Ambition Insights */}
              {report.recruiterNotes?.keyQuotes && report.recruiterNotes.keyQuotes.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-primary" />
                    Subjective Responses & Career Ambition Insights
                  </h3>
                  <div className="space-y-2.5">
                    {report.recruiterNotes.keyQuotes.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg border border-border bg-secondary/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">
                            {q.topic || "Career Ambition & Values"}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded bg-secondary">
                            Verbatim Quote
                          </span>
                        </div>
                        <p className="text-xs italic text-foreground/90 border-l-2 border-primary/50 pl-2.5 my-1">
                          &ldquo;{q.quote}&rdquo;
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          <strong>Recruiter Assessment:</strong> {q.analysis}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overall Score */}
          <div className="flex items-center gap-6 rounded-xl border border-border p-6">
            <div className="flex flex-col items-center">
              <span
                className={`text-4xl font-bold tabular-nums ${getScoreColor(report.overallScore)}`}
              >
                {report.overallScore}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                / 100
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Overall Score</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {report.summary}
              </p>
            </div>
          </div>

          {/* Score Breakdown */}
          <div>
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
              Score Breakdown
            </h2>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Technical", score: report.technicalScore },
                { label: "Communication", score: report.communicationScore },
                { label: "Problem Solving", score: report.problemSolvingScore },
                { label: "Optimization", score: report.optimizationScore },
                { label: "Code Quality", score: report.codeQualityScore },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center rounded-lg border border-border p-4"
                >
                  <span
                    className={`text-xl font-bold tabular-nums ${getScoreColor(item.score)}`}
                  >
                    {item.score}
                  </span>
                  <span className="mt-1 text-center text-[10px] text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              Strengths
            </h2>
            <div className="flex flex-col gap-2">
              {report.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-emerald-400"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-foreground/80">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-amber-800 dark:text-amber-400">
              Areas for Improvement
            </h2>
            <div className="flex flex-col gap-2">
              {report.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-amber-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" x2="12" y1="8" y2="12" />
                    <line x1="12" x2="12.01" y1="16" y2="16" />
                  </svg>
                  <span className="text-foreground/80">{w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <h2 className="mb-3 text-sm font-bold text-blue-700 dark:text-blue-400">
              Suggestions
            </h2>
            <div className="flex flex-col gap-2">
              {report.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0 text-blue-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <span className="text-foreground/80">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Next Steps */}
          {report.nextSteps && report.nextSteps.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold text-purple-700 dark:text-purple-400">
                Actionable Next Steps
              </h2>
              <div className="flex flex-col gap-2">
                {report.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-purple-400">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                    <span className="text-foreground/80">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidate Growth Roadmap (Skill 2 Structured Pathway) */}
          {report.candidateRoadmap && report.candidateRoadmap.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Candidate Growth Pathway
                  </span>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2 mt-1">
                    <Compass className="w-5 h-5 text-primary" />
                    Structured Learning Roadmap
                  </h2>
                </div>
                <span className="text-xs text-muted-foreground">
                  3-Stage Progression
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {report.candidateRoadmap.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-border bg-secondary/30 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                          Step {step.step || idx + 1}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                      <h3 className="text-xs font-bold text-foreground">
                        {step.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/50 text-[11px] text-foreground/80 flex items-start gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>
                        <strong>Practice Advice:</strong> {step.practiceAdvice}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcript Annotations */}
          {messages.length > 0 && (
            <div className="mt-6 border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">
                  Annotated Interview Transcript
                </h2>
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  {showCode ? "Hide Submitted Code" : "View Submitted Code"}
                </button>
              </div>

              {showCode ? (
                <div className="rounded-xl border border-border bg-slate-50 dark:bg-[#121318] p-4 h-[520px] overflow-y-auto font-mono text-xs shadow-xs">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border text-muted-foreground text-[11px]">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Final Submitted Code ({interview.language})
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                      Hover/click line badges for AI code analysis
                    </span>
                  </div>
                  {(!interview.code || interview.code.trim().length === 0) ? (
                    <div className="text-muted-foreground italic p-4 text-center">
                      No code was submitted during this interview session.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {interview.code.split("\n").map((lineText, lineIdx) => {
                        const lineNum = lineIdx + 1;
                        const trimmed = lineText.trim();
                        
                        // Intelligent code line annotations mapping
                        let badge: { type: "info" | "warning" | "success" | "perf"; label: string; detail: string } | null = null;

                        if (lineNum === 1 || trimmed.startsWith("function") || trimmed.startsWith("def") || trimmed.startsWith("public") || trimmed.startsWith("class")) {
                          badge = {
                            type: "info",
                            label: "Signature",
                            detail: `Function signature & entry point. Overall Code Quality: ${report.codeQualityScore}/100.`,
                          };
                        } else if (trimmed.startsWith("for") || trimmed.startsWith("while") || trimmed.includes("recurse")) {
                          badge = {
                            type: "perf",
                            label: `Time ${report.timeComplexity || "O(N)"}`,
                            detail: `Primary loop iteration. Computed Time Complexity: ${report.timeComplexity || "O(N)"}.`,
                          };
                        } else if (trimmed.includes("new ") || trimmed.includes("[]") || trimmed.includes("Map(") || trimmed.includes("Set(") || trimmed.includes("dict(")) {
                          badge = {
                            type: "success",
                            label: `Space ${report.spaceComplexity || "O(1)"}`,
                            detail: `Data structure allocation. Computed Space Complexity: ${report.spaceComplexity || "O(1)"}.`,
                          };
                        } else if (trimmed.startsWith("if") && (trimmed.includes("null") || trimmed.includes("==") || trimmed.includes("<="))) {
                          badge = {
                            type: "warning",
                            label: "Edge Case",
                            detail: report.weaknesses?.[0] || "Boundary and validation check.",
                          };
                        }

                        return (
                          <div
                            key={lineIdx}
                            className="group flex items-center gap-3 px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-white/5 transition-colors"
                          >
                            <span className="w-8 select-none text-right text-slate-400 dark:text-zinc-500 text-[11px] shrink-0 font-mono">
                              {lineNum}
                            </span>
                            <code className="flex-1 text-slate-900 dark:text-slate-100 whitespace-pre font-mono text-[12.5px] leading-relaxed font-medium">
                              {lineText || " "}
                            </code>
                            {badge && (
                              <div
                                className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-sans font-semibold cursor-help transition-all shadow-xs ${
                                  badge.type === "perf"
                                    ? "bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40 group-hover:bg-purple-200/80"
                                    : badge.type === "warning"
                                    ? "bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 group-hover:bg-amber-200/80"
                                    : badge.type === "success"
                                    ? "bg-emerald-100 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40 group-hover:bg-emerald-200/80"
                                    : "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40 group-hover:bg-blue-200/80"
                                }`}
                                title={`${badge.label}: ${badge.detail}`}
                              >
                                <span>{badge.label}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-xl border border-border p-4 bg-muted/20 h-[500px] overflow-y-auto">
                  {messages.map((msg, i) => {
                  const annotation = report.transcriptAnnotations?.find(
                    (a) => a.messageIndex === i
                  );
                  const isAssistant = msg.role === "assistant";

                  return (
                    <div
                      key={i}
                      className={`flex flex-col max-w-[88%] ${
                        isAssistant ? "self-start" : "self-end"
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-4.5 py-3 text-sm shadow-xs ${
                          isAssistant
                            ? "bg-blue-50/70 border border-blue-200/60 text-slate-900 dark:bg-slate-900/90 dark:border-transparent dark:text-slate-100"
                            : "bg-emerald-50/70 border border-emerald-200/60 text-emerald-950 dark:bg-emerald-950/75 dark:border-transparent dark:text-emerald-50 font-medium"
                        }`}
                      >
                        <span
                          className={`text-xs font-semibold tracking-wide uppercase block mb-1 ${
                            isAssistant ? "text-blue-700 dark:text-blue-400" : "text-emerald-700 dark:text-emerald-400 text-right"
                          }`}
                        >
                          {isAssistant ? "Interviewer" : "You"}
                        </span>
                        <MessageContent content={msg.content} isUser={!isAssistant} />
                      </div>
                      {annotation && (
                        <div className="mt-2 flex items-start gap-2.5 text-xs p-3 rounded-xl border border-amber-300/90 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200 w-full shadow-xs">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-amber-700 dark:text-amber-400">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <div className="flex flex-col">
                            <span className="font-bold text-amber-900 dark:text-amber-300 tracking-wide text-xs">{annotation.tag}</span>
                            <span className="text-amber-950 dark:text-amber-100/90 leading-relaxed text-[11.5px] mt-0.5 font-medium">{annotation.rationale}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-border pt-6 mt-4">
            <Link
              href="/dashboard"
              className="h-9 rounded-md bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 inline-flex items-center"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 inline-flex items-center gap-1.5"
            >
              Start New Interview
            </Link>
            <button
              onClick={() => generateReport(true)}
              disabled={isGenerating}
              title="Regenerate Report"
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isGenerating ? "animate-spin" : ""}>
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
