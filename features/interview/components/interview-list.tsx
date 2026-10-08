"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { formatRelativeTime, getScoreColor } from "@/lib/utils";
import { Loader2, ChevronLeft, ChevronRight, AlertCircle, RefreshCw } from "lucide-react";
import { useNavigationLoading } from "@/components/navigation-loading-provider";

export interface Interview {
  id: string;
  language: string;
  difficulty: string;
  duration: number;
  status: string;
  problemTitle: string;
  startedAt?: Date | string | null;
  endedAt?: Date | string | null;
  createdAt: Date | string;
  report: { overallScore: number } | null;
}

interface InterviewListProps {
  interviews?: Interview[];
  initialInterviews?: Interview[];
  totalCount?: number;
  pageSize?: number;
}

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  go: "Go",
};

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "text-emerald-700 dark:text-emerald-400 font-medium",
  medium: "text-amber-800 dark:text-amber-400 font-medium",
  hard: "text-rose-700 dark:text-red-400 font-medium",
};

/**
 * Displays a list of previous interviews with active loading states,
 * capped to a clean 20-item view with pagination controls.
 */
export function InterviewList({
  interviews,
  initialInterviews,
  totalCount,
  pageSize = 20,
}: InterviewListProps) {
  const initialItems = initialInterviews ?? interviews ?? [];
  const [items, setItems] = useState<Interview[]>(initialItems);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(totalCount ?? initialItems.length);
  const [isFetchingPage, setIsFetchingPage] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const { isNavigating, startNavigation } = useNavigationLoading();
  const listTopRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  const handleCardClick = (id: string, href: string) => {
    if (isNavigating) return;
    setActiveInterviewId(id);
    startNavigation(href);
  };

  const handleFetchPage = async (newPage: number) => {
    if (isFetchingPage || newPage < 1 || newPage > totalPages) return;
    setIsFetchingPage(true);
    setFetchError(null);

    try {
      const res = await fetch(`/api/interviews?page=${newPage}&limit=${pageSize}`);
      if (!res.ok) {
        throw new Error("Unable to fetch interviews. Please try again.");
      }
      const data = await res.json();
      setItems(data.interviews || []);
      setPage(newPage);
      if (data.pagination?.total !== undefined) {
        setTotal(data.pagination.total);
      }

      // Smoothly scroll to the top of the interview list for comfortable reading
      listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load interviews";
      setFetchError(message);
    } finally {
      setIsFetchingPage(false);
    }
  };

  if (items.length === 0 && !isFetchingPage) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No previous interviews.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Start your first interview to begin practicing.
        </p>
      </div>
    );
  }

  return (
    <div ref={listTopRef} className="flex flex-col">
      {/* Interview List Cards */}
      <div className={`flex flex-col gap-2 transition-opacity duration-200 ${isFetchingPage ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
        {items.map((interview) => {
          const targetHref =
            interview.status === "completed"
              ? `/report/${interview.id}`
              : `/interview/${interview.id}`;

          const isCardLoading = activeInterviewId === interview.id;
          const isOtherCardDisabled = isNavigating && !isCardLoading;

          const createdIso =
            interview.createdAt instanceof Date
              ? interview.createdAt.toISOString()
              : new Date(interview.createdAt).toISOString();

          return (
            <Link
              key={interview.id}
              href={targetHref}
              onClick={() => handleCardClick(interview.id, targetHref)}
              className={`group flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-all ${
                isCardLoading
                  ? "bg-secondary/90 ring-1 ring-primary/50 shadow-xs cursor-wait"
                  : isOtherCardDisabled
                  ? "opacity-40 pointer-events-none"
                  : "hover:bg-secondary/50 cursor-pointer"
              }`}
            >
              {/* Left: Problem info */}
              <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                <span className="text-sm font-medium text-foreground group-hover:text-foreground/90 truncate">
                  {interview.problemTitle}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span>{LANGUAGE_LABELS[interview.language] ?? interview.language}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className={DIFFICULTY_STYLES[interview.difficulty] ?? ""}>
                    {interview.difficulty.charAt(0).toUpperCase() + interview.difficulty.slice(1)}
                  </span>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{interview.duration} min</span>
                </div>
              </div>

              {/* Right: Score or status + date or loading spinner */}
              <div className="flex items-center gap-3 shrink-0">
                {isCardLoading ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
                    <span className="hidden sm:inline">Opening...</span>
                  </div>
                ) : (
                  <>
                    {interview.report ? (
                      <span className={`text-sm font-semibold ${getScoreColor(interview.report.overallScore)}`}>
                        {interview.report.overallScore}/100
                      </span>
                    ) : (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                        {interview.status === "in_progress" ? "In Progress" : interview.status}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground/60 hidden sm:inline">
                      {formatRelativeTime(createdIso)}
                    </span>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Error Retry Banner */}
      {fetchError && (
        <div className="mt-3 flex items-center justify-between rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => handleFetchPage(page)}
            className="flex items-center gap-1 font-medium hover:underline ml-2 shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Pagination Controls (Visible when more than 20 interviews exist or multiple pages available) */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-4 px-1 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-semibold text-foreground">{startIndex}</span> to{" "}
            <span className="font-semibold text-foreground">{endIndex}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> interviews
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => handleFetchPage(page - 1)}
              disabled={!hasPrevPage || isFetchingPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition font-medium shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            {/* Page Count Display */}
            <span className="px-2 font-medium text-foreground">
              Page {page} of {totalPages}
            </span>

            {/* Next Button */}
            <button
              type="button"
              onClick={() => handleFetchPage(page + 1)}
              disabled={!hasNextPage || isFetchingPage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition font-medium shadow-xs"
            >
              {isFetchingPage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
