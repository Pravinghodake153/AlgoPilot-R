"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/features/admin/components/sidebar";
import { useAdminNotifications } from "@/features/admin/components/admin-notification-system";
import { format } from "date-fns";
import {
  Users,
  Search,
  Trash2,
  ChevronRight,
  ExternalLink,
  Award,
  CheckCircle2,
  Clock,
  Code2,
  Sparkles,
} from "lucide-react";

interface InterviewRecord {
  id: string;
  problemTitle: string;
  difficulty: string;
  createdAt: string;
  status: string;
  report?: {
    overallScore: number;
    isSolved: boolean;
  } | null;
}

interface UserItem {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  interviews?: InterviewRecord[];
  _count?: {
    interviews: number;
  };
}

export default function AdminUsersPage() {
  const { notify } = useAdminNotifications();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin");
        if (!res.ok) {
          throw new Error("Unauthorized or server error");
        }
        const data = await res.json();
        setUsers(data.users || []);
        notify("info", "Users Loaded", `Retrieved ${data.users?.length || 0} registered candidates.`, "FETCH_USERS");
      } catch (err: any) {
        setError(err.message);
        notify("error", "Fetch Failed", err.message || "Failed to load users", "ERROR_FETCH_USERS");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUsers();
  }, [notify]);

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleDeleteUser = async (userId: string, name: string | null) => {
    if (
      !confirm(
        `Are you sure you want to completely delete ${name || "this candidate"} and all their interview records? This action is permanent.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");

      setUsers(users.filter((u) => u.id !== userId));
      notify("success", "User Deleted", `Candidate ${name || userId} has been deleted.`, "DELETE_USER");
    } catch (err: any) {
      notify("error", "Deletion Failed", err.message || "Could not delete user", "ERROR_DELETE");
    }
  };

  const handleDeleteInterview = async (userId: string, interviewId: string, problemTitle: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the interview session "${problemTitle || "this interview"}"?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin?interviewId=${interviewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete interview");

      setUsers(
        users.map((u) => {
          if (u.id === userId) {
            const updatedInterviews = (u.interviews || []).filter((i) => i.id !== interviewId);
            return {
              ...u,
              interviews: updatedInterviews,
              _count: {
                interviews: Math.max(0, (u._count?.interviews || 1) - 1),
              },
            };
          }
          return u;
        })
      );
      notify("success", "Interview Removed", `Session "${problemTitle}" deleted.`, "DELETE_INTERVIEW");
    } catch (err: any) {
      notify("error", "Failed", err.message || "Could not delete interview", "ERROR_DELETE");
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.clerkId && u.clerkId.toLowerCase().includes(q))
    );
  });

  const totalInterviews = users.reduce((acc, u) => acc + (u._count?.interviews || 0), 0);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Loading Candidates & Users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm font-semibold text-rose-600">Access Denied: {error}</p>
          <Link href="/dashboard" className="text-xs text-primary hover:underline">
            &larr; Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />

      <div className="flex-1 overflow-auto p-6 md:p-10">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Candidates & Users
              </h1>
              <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {users.length} Registered
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage candidate profiles, review completed technical interviews, and inspect score reports.
            </p>
          </div>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Candidates
            </span>
            <div className="mt-2 text-3xl font-bold text-foreground">{users.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Registered on platform</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Interviews Conducted
            </span>
            <div className="mt-2 text-3xl font-bold text-foreground">{totalInterviews}</div>
            <p className="mt-1 text-xs text-muted-foreground">Total candidate sessions</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Average Sessions
            </span>
            <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {users.length > 0 ? (totalInterviews / users.length).toFixed(1) : "0"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Interviews per candidate</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by name, email, or Clerk ID..."
              className="w-full rounded-lg border border-input bg-card pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring shadow-xs"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="mx-auto h-8 w-8 opacity-40 mb-2" />
              <p className="text-sm font-medium text-foreground">No candidates match your search</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching by a different name or email.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/50 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Candidate</th>
                    <th className="px-5 py-3.5">Registered</th>
                    <th className="px-5 py-3.5 text-center">Interviews</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => {
                    const isExpanded = !!expandedUsers[user.id];
                    const interviews = user.interviews || [];

                    return (
                      <React.Fragment key={user.id}>
                        <tr className="transition-colors hover:bg-secondary/30">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleUserExpansion(user.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                                aria-label="Toggle interview history"
                              >
                                <ChevronRight
                                  className={`h-4 w-4 transition-transform duration-200 ${
                                    isExpanded ? "rotate-90" : ""
                                  }`}
                                />
                              </button>

                              <div>
                                <div className="font-semibold text-foreground text-sm">
                                  {user.name || "Anonymous Candidate"}
                                </div>
                                <div className="text-muted-foreground font-mono text-[11px]">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-muted-foreground">
                            {format(new Date(user.createdAt), "MMM d, yyyy")}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center justify-center rounded-full bg-secondary px-2.5 py-0.5 font-mono text-xs font-bold text-foreground">
                              {user._count?.interviews || 0}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete candidate account"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Interview Session History */}
                        {isExpanded && (
                          <tr className="bg-secondary/20">
                            <td colSpan={4} className="p-4 sm:p-6">
                              <div className="ml-4 pl-4 border-l-2 border-primary/30 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Interview Sessions ({interviews.length})
                                  </h4>
                                </div>

                                {interviews.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">
                                    This candidate has not started any interview sessions yet.
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {interviews.map((interview) => (
                                      <div
                                        key={interview.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-xs"
                                      >
                                        <div className="space-y-0.5">
                                          <div className="font-semibold text-sm text-foreground">
                                            {interview.problemTitle}
                                          </div>
                                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                            <span className="capitalize font-medium">{interview.difficulty}</span>
                                            <span>·</span>
                                            <span>
                                              {format(new Date(interview.createdAt), "MMM d, yyyy · HH:mm")}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          {interview.report ? (
                                            <div className="flex flex-col items-end">
                                              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                {interview.report.overallScore}/100
                                              </span>
                                              <span
                                                className={`text-[10px] font-medium ${
                                                  interview.report.isSolved
                                                    ? "text-emerald-600 dark:text-emerald-400"
                                                    : "text-amber-600 dark:text-amber-400"
                                                }`}
                                              >
                                                {interview.report.isSolved ? "Solved" : "Not Solved"}
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-[11px] text-muted-foreground italic">
                                              In Progress / No Report
                                            </span>
                                          )}

                                          <Link
                                            href={`/report/${interview.id}`}
                                            target="_blank"
                                            className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                                          >
                                            <span>Report</span>
                                            <ExternalLink className="h-3 w-3" />
                                          </Link>

                                          <button
                                            onClick={() =>
                                              handleDeleteInterview(
                                                user.id,
                                                interview.id,
                                                interview.problemTitle
                                              )
                                            }
                                            className="rounded-md p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                            title="Delete interview session"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
