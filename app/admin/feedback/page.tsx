"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/features/admin/components/sidebar";
import { Star, MessageSquare, Search, Filter, Calendar, User, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface FeedbackItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  useEffect(() => {
    async function loadFeedbacks() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          const data = await res.json();
          setFeedbacks(data || []);
        }
      } catch (err) {
        console.error("Failed to load feedbacks:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFeedbacks();
  }, []);

  const totalCount = feedbacks.length;
  const averageRating =
    totalCount > 0
      ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / totalCount).toFixed(1)
      : "0.0";
  const fiveStarCount = feedbacks.filter((f) => f.rating === 5).length;

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesRating = ratingFilter === null || f.rating === ratingFilter;
    const matchesSearch =
      searchQuery.trim() === "" ||
      (f.comment && f.comment.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.user?.email && f.user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.user?.name && f.user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRating && matchesSearch;
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />

      <div className="flex-1 overflow-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                User Feedbacks
              </h1>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {totalCount} Total
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Review candid post-interview ratings, bug reports, and candidate evaluations.
            </p>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Average Rating</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">{averageRating}</span>
              <span className="text-xs text-muted-foreground">/ 5.0</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(Number(averageRating))
                      ? "fill-amber-400 text-amber-500"
                      : "fill-transparent text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Submissions</span>
            <div className="mt-2 text-3xl font-bold text-foreground">{totalCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Candidate interviews reviewed</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">5-Star Feedback</span>
            <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{fiveStarCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalCount > 0 ? `${Math.round((fiveStarCount / totalCount) * 100)}% satisfaction` : "No ratings yet"}
            </p>
          </div>
        </div>

        {/* Search and Rating Filters */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate feedback or email..."
              className="w-full rounded-lg border border-input bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setRatingFilter(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                ratingFilter === null
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  ratingFilter === r
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <span>{r}</span>
                <Star className={`w-3 h-3 ${ratingFilter === r ? "fill-primary-foreground text-primary-foreground" : "fill-amber-400 text-amber-500"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Feedback List Table / Cards */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading feedbacks...</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-medium text-foreground">No matching feedback found</p>
            <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or rating filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-semibold text-xs text-foreground">
                      {fb.user?.name ? fb.user.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {fb.user?.name || "Anonymous Candidate"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground font-mono">{fb.user?.email || "No email"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Stars */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= fb.rating
                              ? "fill-amber-400 text-amber-500"
                              : "fill-transparent text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-[11px] text-muted-foreground font-mono">
                      {format(new Date(fb.createdAt), "MMM d, yyyy · HH:mm")}
                    </span>
                  </div>
                </div>

                <div className="pt-3">
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {fb.comment ? fb.comment : <span className="text-muted-foreground italic">No written comment provided.</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
