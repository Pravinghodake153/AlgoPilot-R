"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "@/features/admin/components/sidebar";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  MonitorX,
  EyeOff,
  Users,
  Clock,
  Calendar,
  ExternalLink,
  Filter,
  FileText,
  AlertCircle,
  Database,
  X,
  Award,
} from "lucide-react";
import { format } from "date-fns";

interface Candidate {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
}

interface WarningItem {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  message: string;
  details: any;
}

interface CheaterItem {
  id: string;
  interviewNumber: number;
  totalInterviewsByUser: number;
  candidate: Candidate;
  problemTitle: string;
  difficulty: string;
  status: string;
  timing: {
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
    durationMinutes: number;
    activeDurationMinutes: number;
  };
  cheatSummary: {
    tabSwitchCount: number;
    outOfFrameSeconds: number;
    multiplePeopleCount: number;
    totalViolations: number;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
    modes: string[];
  };
  warnings: WarningItem[];
  reportId: string | null;
  score: number | null;
}

interface CheaterMetrics {
  totalCheaters: number;
  highRiskCount: number;
  totalTabSwitches: number;
  totalOutOfFrameSeconds: number;
  totalMultiplePeople: number;
}

export default function CheatersAdminPage() {
  const [cheaters, setCheaters] = useState<CheaterItem[]>([]);
  const [metrics, setMetrics] = useState<CheaterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "HIGH_RISK" | "TAB_SWITCH" | "CAMERA" | "MULTIPLE_PEOPLE">("ALL");
  const [selectedCheater, setSelectedCheater] = useState<CheaterItem | null>(null);

  const fetchCheaters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cheaters");
      if (res.ok) {
        const data = await res.json();
        setCheaters(data.cheaters || []);
        setMetrics(data.metrics || null);
      }
    } catch (err) {
      console.error("Failed to load cheaters data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheaters();
  }, []);

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedCheater(null);
      }
    };
    if (selectedCheater) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCheater]);

  // Filter cheaters according to search query and mode
  const filteredCheaters = useMemo(() => {
    return cheaters.filter((item) => {
      const matchesSearch =
        item.candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.candidate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.problemTitle.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterMode === "HIGH_RISK") return item.cheatSummary.riskLevel === "HIGH";
      if (filterMode === "TAB_SWITCH") return item.cheatSummary.tabSwitchCount > 0;
      if (filterMode === "CAMERA") return item.cheatSummary.outOfFrameSeconds > 0;
      if (filterMode === "MULTIPLE_PEOPLE") return item.cheatSummary.multiplePeopleCount > 0;

      return true;
    });
  }, [cheaters, searchQuery, filterMode]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Header */}
        <header className="p-8 border-b border-border bg-card shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shadow-xs">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    Cheaters & Proctoring Violations
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-destructive/15 text-destructive border border-destructive/30">
                      Integrity Audit
                    </span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Strict log of candidates who triggered tab switches, webcam frame absences, or multiple person alerts.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchCheaters}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-secondary hover:border-primary/40 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh Logs
              </button>
            </div>
          </div>

          {/* Metric cards */}
          {metrics && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-6">
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/15 text-destructive">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold text-destructive leading-tight">
                    {metrics.totalCheaters}
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground">Total Flagged</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground leading-tight">
                    {metrics.highRiskCount}
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground">High Risk</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <MonitorX className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground leading-tight">
                    {metrics.totalTabSwitches}
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground">Tab Switches</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground leading-tight">
                    {metrics.totalOutOfFrameSeconds}s
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground">Out of Frame</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xl font-bold text-foreground leading-tight">
                    {metrics.totalMultiplePeople}
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground">Multiple People</div>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Filters and Controls */}
        <section className="px-8 py-4 border-b border-border bg-card/50 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search candidate name, email, or problem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter:</span>
            </div>
            {(
              [
                { label: "All Cheaters", value: "ALL" },
                { label: "High Risk", value: "HIGH_RISK" },
                { label: "Tab Switches", value: "TAB_SWITCH" },
                { label: "Camera Away", value: "CAMERA" },
                { label: "Multiple People", value: "MULTIPLE_PEOPLE" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.value}
                type="button"
                onClick={() => setFilterMode(btn.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === btn.value
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </section>

        {/* Responsive Table Area */}
        <div className="flex-1 p-8 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-muted-foreground space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Scanning integrity logs for violations...</p>
            </div>
          ) : filteredCheaters.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center border border-border rounded-2xl bg-card shadow-xs">
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-500/20">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {searchQuery || filterMode !== "ALL"
                  ? "No Flagged Candidates Match Criteria"
                  : "Zero Cheating Violations Detected"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1">
                {searchQuery || filterMode !== "ALL"
                  ? "Try adjusting your search terms or filters above."
                  : "All interviews currently comply with proctoring standards. When candidates switch tabs or leave webcam view, they will appear here automatically."}
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th className="py-3.5 px-5">Candidate</th>
                      <th className="py-3.5 px-5">Interview</th>
                      <th className="py-3.5 px-5">Timing & Duration</th>
                      <th className="py-3.5 px-5">Risk Level</th>
                      <th className="py-3.5 px-5 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCheaters.map((item) => {
                      const formattedDate = format(new Date(item.timing.createdAt), "MMM d, yyyy");
                      const formattedTime = format(new Date(item.timing.createdAt), "h:mm a");

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedCheater(item)}
                          className="cursor-pointer transition-colors hover:bg-muted/30 group"
                        >
                          {/* Candidate */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              {item.candidate.imageUrl ? (
                                <img
                                  src={item.candidate.imageUrl}
                                  alt={item.candidate.name}
                                  className="w-9 h-9 rounded-full object-cover border border-border shadow-2xs"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground text-xs border border-border">
                                  {item.candidate.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                                  {item.candidate.name}
                                </div>
                                <div className="text-muted-foreground text-[11px]">
                                  {item.candidate.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Interview Number & Problem */}
                          <td className="py-4 px-5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px] border border-border">
                                  Interview #{item.interviewNumber}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  (ID: {item.id.slice(0, 8)})
                                </span>
                              </div>
                              <div className="font-medium text-foreground line-clamp-1 max-w-xs">
                                {item.problemTitle}
                              </div>
                            </div>
                          </td>

                          {/* Timing & Duration */}
                          <td className="py-4 px-5">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 font-medium text-foreground">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{formattedDate}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formattedTime} • {item.timing.activeDurationMinutes} mins
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Risk Level Badge */}
                          <td className="py-4 px-5">
                            {item.cheatSummary.riskLevel === "HIGH" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-destructive/15 text-destructive border border-destructive/30">
                                <AlertTriangle className="w-3 h-3" />
                                High Risk
                              </span>
                            )}
                            {item.cheatSummary.riskLevel === "MEDIUM" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                                <AlertCircle className="w-3 h-3" />
                                Medium Risk
                              </span>
                            )}
                            {item.cheatSummary.riskLevel === "LOW" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-secondary text-muted-foreground border border-border">
                                Low Risk
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-4 px-5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCheater(item);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-secondary/80 text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            >
                              <span>Inspect Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* BIG 80% SCREEN POPUP MODAL */}
      {selectedCheater && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50 duration-200"
          onClick={() => setSelectedCheater(null)}
        >
          <div
            className="w-[82vw] max-w-5xl h-[85vh] bg-card text-foreground border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-border bg-card flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                {selectedCheater.candidate.imageUrl ? (
                  <img
                    src={selectedCheater.candidate.imageUrl}
                    alt={selectedCheater.candidate.name}
                    className="w-12 h-12 rounded-full object-cover border border-border shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground text-sm border border-border shadow-xs">
                    {selectedCheater.candidate.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      {selectedCheater.candidate.name}
                    </h2>
                    {selectedCheater.cheatSummary.riskLevel === "HIGH" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-destructive/15 text-destructive border border-destructive/30">
                        <AlertTriangle className="w-3 h-3" />
                        High Risk
                      </span>
                    )}
                    {selectedCheater.cheatSummary.riskLevel === "MEDIUM" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                        <AlertCircle className="w-3 h-3" />
                        Medium Risk
                      </span>
                    )}
                    {selectedCheater.cheatSummary.riskLevel === "LOW" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase bg-secondary text-muted-foreground border border-border">
                        Low Risk
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{selectedCheater.candidate.email}</span>
                    <span>•</span>
                    <span className="font-semibold text-foreground">
                      Interview #{selectedCheater.interviewNumber}
                    </span>
                    <span>•</span>
                    <span>ID: {selectedCheater.id}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCheater(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border transition-colors cursor-pointer"
                title="Close Window (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Top 3 Summary Cards for Cheat Modes */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Detected Modes of Cheat
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tab switches */}
                  <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        Tab Switches
                      </span>
                      <MonitorX className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-2">
                      {selectedCheater.cheatSummary.tabSwitchCount} times
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Candidate minimized window, switched browser tabs, or clicked outside the interview.
                    </p>
                  </div>

                  {/* Camera Out of frame */}
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Camera Absence
                      </span>
                      <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-2">
                      {selectedCheater.cheatSummary.outOfFrameSeconds}s total
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Candidate was detected completely away from webcam or face was not visible.
                    </p>
                  </div>

                  {/* Multiple people */}
                  <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        Multiple People
                      </span>
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-2">
                      {selectedCheater.cheatSummary.multiplePeopleCount} incidents
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Machine Learning computer vision detected additional unauthorized people in the camera frame.
                    </p>
                  </div>
                </div>
              </div>

              {/* Interview Meta Details Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Interview Session Information
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-border bg-card">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Problem Title</div>
                    <div className="text-xs font-bold text-foreground mt-0.5 line-clamp-1">
                      {selectedCheater.problemTitle}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Difficulty & Status</div>
                    <div className="text-xs font-semibold text-foreground mt-0.5 capitalize">
                      {selectedCheater.difficulty} • {selectedCheater.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Date & Timing</div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">
                      {format(new Date(selectedCheater.timing.createdAt), "MMM d, yyyy • h:mm a")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Active Duration</div>
                    <div className="text-xs font-semibold text-foreground mt-0.5">
                      {selectedCheater.timing.activeDurationMinutes} mins
                    </div>
                  </div>
                </div>
              </div>

              {/* Warnings and Violations Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Chronological Warnings & Violations Timeline ({selectedCheater.warnings.length})
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Exact incident timestamps recorded in real time
                  </span>
                </div>

                <div className="space-y-2.5">
                  {selectedCheater.warnings.length === 0 ? (
                    <div className="p-4 rounded-xl border border-border bg-muted/20 text-center text-xs text-muted-foreground">
                      No discrete individual incident logs found; overall interview counters recorded.
                    </div>
                  ) : (
                    selectedCheater.warnings.map((warning, wIdx) => {
                      const warnTime = format(new Date(warning.timestamp), "h:mm:ss a");
                      const warnDate = format(new Date(warning.timestamp), "MMM d, yyyy");

                      return (
                        <div
                          key={warning.id || wIdx}
                          className="flex items-start gap-3.5 p-3.5 rounded-xl border border-border bg-card hover:bg-secondary/40 transition-colors shadow-2xs"
                        >
                          <div className="p-2 rounded-lg bg-destructive/10 text-destructive mt-0.5 shrink-0">
                            {warning.type === "TAB_SWITCH" && <MonitorX className="w-4 h-4" />}
                            {warning.type === "CAMERA_OUT_OF_FRAME" && <EyeOff className="w-4 h-4" />}
                            {warning.type === "MULTIPLE_PERSONS_DETECTED" && (
                              <Users className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-foreground text-xs">
                                {warning.title}
                              </span>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {warnDate} at {warnTime}
                              </span>
                            </div>
                            <p className="text-muted-foreground text-xs mt-1">
                              {warning.message}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {selectedCheater.reportId ? (
                  <Link
                    href={`/report/${selectedCheater.reportId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Open Evaluation Report
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Evaluation report not generated yet
                  </span>
                )}
                <Link
                  href="/admin/database"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-border bg-secondary text-foreground hover:bg-muted transition-colors shadow-2xs"
                >
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  Database Event Logs
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCheater(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
