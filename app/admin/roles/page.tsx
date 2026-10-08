"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/features/admin/components/sidebar";
import { useAdminNotifications } from "@/features/admin/components/admin-notification-system";
import {
  Briefcase,
  Plus,
  Sparkles,
  Layers,
  Zap,
  Award,
  CheckCircle2,
  Trash2,
  ExternalLink,
  RotateCw,
  Search,
  Filter,
  Check,
  Building,
  GraduationCap,
  X,
  FileQuestion,
  Users,
} from "lucide-react";
import { INTERVIEWER_SKILLS, REPORT_EVALUATOR_SKILLS } from "@/types/skills";

interface JobRole {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  department: string | null;
  level: string | null;
  mode: string;
  hybridVoice: string | null;
  interviewerSkill: string;
  evaluatorSkill: string;
  targetSkills: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    questions: number;
    interviews: number;
  };
}

export default function InterviewRolesPage() {
  const { notify } = useAdminNotifications();
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [interviewerSkills, setInterviewerSkills] = useState<{ id: string; name: string; slug: string; isBuiltIn: boolean }[]>([]);
  const [evaluatorSkills, setEvaluatorSkills] = useState<{ id: string; name: string; slug: string; isBuiltIn: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state for creating a new role
  const [newTitle, setNewTitle] = useState("");
  const [newDepartment, setNewDepartment] = useState("Engineering");
  const [newLevel, setNewLevel] = useState("Mid-Level");
  const [newMode, setNewMode] = useState<"dynamic" | "hybrid">("dynamic");
  const [newInterviewerSkill, setNewInterviewerSkill] = useState("startup_pragmatist");
  const [newEvaluatorSkill, setNewEvaluatorSkill] = useState("executive_committee");
  const [newTargetSkills, setNewTargetSkills] = useState(
    "System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership"
  );
  const [newDescription, setNewDescription] = useState("");
  const [copyFromId, setCopyFromId] = useState<string>("global");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRolesAndSkills();
  }, []);

  const fetchRolesAndSkills = async () => {
    try {
      setLoading(true);
      const [rolesRes, skillsRes] = await Promise.all([
        fetch("/api/admin/roles"),
        fetch("/api/skills"),
      ]);

      if (!rolesRes.ok) throw new Error("Failed to load job roles");
      const data = await rolesRes.json();
      setRoles(data.roles || []);

      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        if (skillsData.interviewers) setInterviewerSkills(skillsData.interviewers);
        if (skillsData.evaluators) setEvaluatorSkills(skillsData.evaluators);
      }
    } catch (err: any) {
      notify("error", "Failed to Load Roles", err.message || "Could not fetch roles", "FETCH_ROLES");
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (roleId: string, title: string) => {
    try {
      const res = await fetch(`/api/admin/roles/${roleId}/set-default`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to set default role");
      setRoles((prev) =>
        prev.map((r) => ({
          ...r,
          isDefault: r.id === roleId,
        }))
      );
      notify("success", "Default Role Set", `"${title}" is now the default interview role.`, "SET_DEFAULT_ROLE");
    } catch (err: any) {
      notify("error", "Error", err.message || "Failed to update default role", "ERROR_ROLE");
    }
  };

  const handleDeleteRole = async (roleId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete role");
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
      notify("info", "Role Deleted", `Removed "${title}" from job roles.`, "DELETE_ROLE");
    } catch (err: any) {
      notify("error", "Delete Failed", err.message || "Could not delete role", "ERROR_ROLE");
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          department: newDepartment.trim(),
          level: newLevel.trim(),
          mode: newMode,
          interviewerSkill: newInterviewerSkill,
          evaluatorSkill: newEvaluatorSkill,
          targetSkills: newTargetSkills.trim(),
          description: newDescription.trim() || undefined,
          copyQuestionsFromRoleId: copyFromId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create job role");
      }

      const data = await res.json();
      setRoles((prev) => [data.role, ...prev]);
      setIsCreateModalOpen(false);
      resetForm();
      notify("success", "Job Role Created", `Created "${data.role.title}" successfully.`, "CREATE_ROLE");
    } catch (err: any) {
      notify("error", "Creation Failed", err.message || "Could not create role", "ERROR_ROLE");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewDepartment("Engineering");
    setNewLevel("Mid-Level");
    setNewMode("dynamic");
    setNewInterviewerSkill("startup_pragmatist");
    setNewEvaluatorSkill("executive_committee");
    setNewTargetSkills("System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership");
    setNewDescription("");
    setCopyFromId("global");
  };

  const filteredRoles = roles.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.department && r.department.toLowerCase().includes(q)) ||
      (r.level && r.level.toLowerCase().includes(q)) ||
      (r.targetSkills && r.targetSkills.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3 text-primary" />
                  Interview Roles & Job Templates
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Interview Roles
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Configure dedicated interview setups for specific job titles. Save unique questions, stages, timers, and dual skills for each role. Candidates choose their target role when starting an interview.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={fetchRolesAndSkills}
                className="p-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                title="Refresh roles"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create Job Role
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search job roles by title, department, level, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card text-foreground text-xs rounded-lg border border-border pl-9 pr-4 py-2.5 outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
            </div>
          </div>

          {/* Roles Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-xl border border-border bg-card/40 animate-pulse p-6" />
              ))}
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3 bg-card/40">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No Interview Roles Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "No job roles match your search query."
                  : "Create your first job role to bundle questions, stages, and skills for specific engineering positions."}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Role
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRoles.map((role) => {
                const interviewerSkillDef =
                  interviewerSkills.find((s) => s.slug === role.interviewerSkill) ||
                  INTERVIEWER_SKILLS[role.interviewerSkill];
                const evaluatorSkillDef =
                  evaluatorSkills.find((s) => s.slug === role.evaluatorSkill) ||
                  REPORT_EVALUATOR_SKILLS[role.evaluatorSkill];

                return (
                  <div
                    key={role.id}
                    className={`rounded-xl border p-6 flex flex-col justify-between transition-all bg-card shadow-xs ${
                      role.isDefault
                        ? "border-primary/50 ring-1 ring-primary/20"
                        : "border-border hover:border-border/90"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {role.isDefault && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                <Check className="w-3 h-3 text-primary" />
                                Default Role
                              </span>
                            )}
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary text-muted-foreground flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {role.department || "Engineering"}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary text-muted-foreground flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {role.level || "Mid-Level"}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-foreground tracking-tight">
                            {role.title}
                          </h2>
                        </div>

                        {/* Mode Indicator */}
                        <div className="shrink-0">
                          {role.mode === "dynamic" ? (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-blue-500" />
                              Dynamic AI
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-emerald-500" />
                              Hybrid Voice
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {role.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {role.description}
                        </p>
                      )}

                      {/* Dual Skills Badge Area */}
                      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/50 text-xs">
                        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/60 space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Zap className="w-3 h-3 text-primary" />
                            Skill 1: Interviewer
                          </span>
                          <span className="font-semibold text-foreground text-xs block truncate">
                            {interviewerSkillDef?.name || role.interviewerSkill}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/60 space-y-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Award className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            Skill 2: Evaluator
                          </span>
                          <span className="font-semibold text-foreground text-xs block truncate">
                            {evaluatorSkillDef?.name || role.evaluatorSkill}
                          </span>
                        </div>
                      </div>

                      {/* Target Competencies Tags */}
                      {role.targetSkills && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Target Competencies to Assess
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {role.targetSkills.split(",").map((s, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded bg-secondary/80 text-foreground/80 font-mono"
                              >
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/50">
                        {role.mode === "dynamic" ? (
                          <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
                            <Sparkles className="w-3.5 h-3.5" />
                            Autonomous AI (No manual questions)
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                            <FileQuestion className="w-3.5 h-3.5" />
                            {role._count?.questions ?? 0} Studio Questions
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          {role._count?.interviews ?? 0} Interviews Taken
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        {!role.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(role.id, role.title)}
                            className="px-2.5 py-1.5 rounded-md border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
                          >
                            Set Default
                          </button>
                        )}
                        {!role.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role.id, role.title)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                            title="Delete role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <Link
                        href={`/admin/voice-studio?roleId=${role.id}`}
                        className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <span>Configure in Studio</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Job Role */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Create New Interview Role
                </h3>
                <p className="text-xs text-muted-foreground">
                  Define a customized role template with questions, stages, and evaluation skills.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
              {/* Job Title */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Frontend React Engineer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-secondary/50 text-foreground rounded-lg border border-border px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Department & Level */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering / Product"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full bg-secondary/50 text-foreground rounded-lg border border-border px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Seniority Level</label>
                  <input
                    type="text"
                    placeholder="e.g. Junior / Mid / Senior / Lead"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="w-full bg-secondary/50 text-foreground rounded-lg border border-border px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Role Description</label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe what this position requires..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-secondary/50 text-foreground rounded-lg border border-border px-3.5 py-2 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Pipeline Mode */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Interview Pipeline Mode</label>
                  <span className="text-[10px] text-muted-foreground">Decided per job card</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select how this job runs. If you want the same role tested in both modes, create two separate cards (e.g. <em>&quot;Frontend Engineer (Dynamic)&quot;</em> and <em>&quot;Frontend Engineer (Hybrid)&quot;</em>).
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewMode("dynamic")}
                    className={`p-3.5 rounded-lg border text-left transition cursor-pointer ${
                      newMode === "dynamic"
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-foreground">Full Dynamic AI Mode</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      Autonomous AI questions & real-time tool calling. <strong>No manual questions needed</strong>.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewMode("hybrid")}
                    className={`p-3.5 rounded-lg border text-left transition cursor-pointer ${
                      newMode === "hybrid"
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-foreground">Structured Hybrid Mode</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      Step-by-step questions, pre-recorded voice audio, and rubrics managed in Studio.
                    </p>
                  </button>
                </div>
              </div>

              {/* Dual Skills (Enabled for BOTH Hybrid and Dynamic!) */}
              <div className="p-3.5 rounded-lg border border-border bg-secondary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Dual-Skill System (Active in {newMode === "dynamic" ? "Dynamic AI" : "Hybrid"} Mode)
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Both modes utilize skills
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Skill 1: Live Interviewer</label>
                    <select
                      value={newInterviewerSkill}
                      onChange={(e) => setNewInterviewerSkill(e.target.value)}
                      className="w-full bg-card text-foreground rounded-lg border border-border p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs font-medium"
                    >
                      {interviewerSkills.length > 0
                        ? interviewerSkills.map((sk) => (
                            <option key={sk.slug} value={sk.slug}>
                              {sk.name} {!sk.isBuiltIn ? "(Custom)" : ""}
                            </option>
                          ))
                        : Object.values(INTERVIEWER_SKILLS).map((sk) => (
                            <option key={sk.id} value={sk.id}>
                              {sk.name}
                            </option>
                          ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      {newMode === "dynamic"
                        ? "Governs live conversational persona, questioning, & tool actions."
                        : "Governs interviewer tone, hinting strategy, & secondary probes."}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">Skill 2: Report Evaluator</label>
                    <select
                      value={newEvaluatorSkill}
                      onChange={(e) => setNewEvaluatorSkill(e.target.value)}
                      className="w-full bg-card text-foreground rounded-lg border border-border p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs font-medium"
                    >
                      {evaluatorSkills.length > 0
                        ? evaluatorSkills.map((sk) => (
                            <option key={sk.slug} value={sk.slug}>
                              {sk.name} {!sk.isBuiltIn ? "(Custom)" : ""}
                            </option>
                          ))
                        : Object.values(REPORT_EVALUATOR_SKILLS).map((sk) => (
                            <option key={sk.id} value={sk.id}>
                              {sk.name}
                            </option>
                          ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Synthesizes executive scorecard, recruiter verdict, & candidate learning roadmap.
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Skills */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Target Competencies (Comma-separated)</label>
                <input
                  type="text"
                  value={newTargetSkills}
                  onChange={(e) => setNewTargetSkills(e.target.value)}
                  placeholder="e.g. React Architecture, State Management, Web Performance, Ambition"
                  className="w-full bg-secondary/50 text-foreground rounded-lg border border-border px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-primary font-mono text-[11px]"
                />
              </div>

              {/* Initial Questions Source (Only for Hybrid mode) */}
              {newMode === "hybrid" ? (
                <div className="space-y-1.5 pt-1">
                  <label className="font-semibold text-foreground">Initialize Questions From</label>
                  <select
                    value={copyFromId}
                    onChange={(e) => setCopyFromId(e.target.value)}
                    className="w-full bg-secondary/50 text-foreground rounded-lg border border-border p-2.5 outline-none focus:ring-1 focus:ring-primary text-xs"
                  >
                    <option value="global">Standard Template (5 Multi-Category Questions)</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        Copy from: {r.title} ({r._count?.questions ?? 0} questions)
                      </option>
                    ))}
                    <option value="">Start Empty (Configure in Studio)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    You can add, edit, and record voice clips for these questions in the Studio page.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Full Dynamic AI Mode Selected:</span>
                    <span>No manual static questions needed. In Studio, this role will open directly into the Dynamic AI Engine view with autonomous questioning and tool-calling.</span>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? "Creating..." : "Save Job Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
