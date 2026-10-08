"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Activity } from "lucide-react";

interface ProgressChartProps {
  interviews: Array<{
    id: string;
    createdAt: Date | string;
    report: { overallScore: number } | null;
  }>;
}

export function ProgressChart({ interviews }: ProgressChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Keep all completed interviews with valid scores, sorted chronologically (oldest to newest)
  const completed = useMemo(() => {
    return interviews
      .filter((i) => i.report !== null && typeof i.report?.overallScore === "number")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [interviews]);

  const isScrollable = completed.length > 10;

  // Check scroll positions for chevron buttons
  const updateScrollState = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // Auto-scroll to the newest interviews on the right upon mount or update
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && isScrollable) {
      el.scrollLeft = el.scrollWidth;
      // Slight timeout to let layout settle and re-evaluate scroll buttons
      setTimeout(updateScrollState, 50);
    }
  }, [isScrollable, completed.length]);

  if (completed.length < 2) {
    return null; // Not enough data to show progress
  }

  const latestScore = completed[completed.length - 1].report!.overallScore;
  const previousScore = completed[completed.length - 2].report!.overallScore;
  const diff = latestScore - previousScore;

  const trendIcon =
    diff > 0 ? (
      <TrendingUp className="h-4 w-4 text-emerald-500" />
    ) : diff < 0 ? (
      <TrendingDown className="h-4 w-4 text-rose-500" />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground" />
    );

  const trendText =
    diff > 0
      ? `+${diff} points from last interview`
      : diff < 0
      ? `${diff} points from last interview`
      : "No change from last interview";

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 240;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 mb-8 mt-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold leading-none tracking-tight flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Performance Trend
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
            {trendIcon}
            <span>{trendText}</span>
          </p>
        </div>

        {/* Scroll Controls & Counter (Visible when > 10 interviews exist) */}
        {isScrollable && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-muted-foreground font-mono bg-muted/70 px-2 py-0.5 rounded border border-border/60">
              {completed.length} interviews
            </span>
            <div className="flex items-center gap-1 border border-border/80 rounded-md p-0.5 bg-background shadow-xs">
              <button
                type="button"
                onClick={() => handleScroll("left")}
                disabled={!canScrollLeft}
                aria-label="Scroll older interviews"
                title="Scroll older interviews"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("right")}
                disabled={!canScrollRight}
                aria-label="Scroll newer interviews"
                title="Scroll newer interviews"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart Container */}
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollState}
        className={`w-full ${
          isScrollable
            ? "overflow-x-auto overflow-y-hidden scroll-smooth pb-2 pt-6"
            : "pt-6"
        }`}
        style={{ scrollbarWidth: "thin" }}
      >
        <div
          className={`h-[120px] flex items-end ${
            isScrollable ? "gap-3 min-w-max px-2" : "gap-2 w-full"
          }`}
        >
          {completed.map((interview) => {
            const score = interview.report!.overallScore;
            const height = Math.max(score, 6); // min height 6%

            let color = "bg-primary/20 hover:bg-primary/30";
            if (score >= 80) color = "bg-emerald-500/80 hover:bg-emerald-500";
            else if (score >= 60) color = "bg-amber-500/80 hover:bg-amber-500";
            else if (score < 60) color = "bg-rose-500/80 hover:bg-rose-500";

            return (
              <div
                key={interview.id}
                className={`group relative flex flex-col justify-end items-center h-full ${
                  isScrollable ? "w-11 shrink-0" : "flex-1"
                }`}
              >
                {/* Tooltip */}
                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap z-30 shadow-md border border-border">
                  {score} pts • {format(new Date(interview.createdAt), "MMM d")}
                </div>
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${color}`}
                  style={{ height: `${height}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {isScrollable && (
        <div className="mt-2 text-[11px] text-muted-foreground/70 flex items-center justify-between">
          <span>Older</span>
          <span className="italic">← Scroll horizontally to see full progress →</span>
          <span>Recent</span>
        </div>
      )}
    </div>
  );
}
