"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sidebar } from "@/features/admin/components/sidebar";
import { useAdminNotifications } from "@/features/admin/components/admin-notification-system";
import {
  Sparkles,
  Zap,
  Award,
  Upload,
  FolderUp,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  Eye,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  BookOpen,
  Cpu,
  ShieldCheck,
  Users,
  Code2,
  HeartHandshake,
  FileCode,
} from "lucide-react";

interface UploadedFile {
  name: string;
  content: string;
  size?: number;
}

interface AiSkill {
  id: string;
  name: string;
  slug: string;
  type: "interviewer" | "evaluator";
  category: string | null;
  description: string | null;
  badge: string | null;
  content: string;
  files: UploadedFile[] | null;
  isBuiltIn: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const INTERVIEWER_SAMPLE_TEMPLATE = `# Custom AI Interviewer Persona

## Pacing & Style
- Pacing: Swift, conversational, pragmatic, and goal-oriented.
- Value: Focus on getting things to work, modularity, simplicity, and business trade-offs.

## Probing Rules
- Open-Ended: Ask what the candidate built from scratch, how they handle ambiguity, and what they do when systems break.
- Hinting Philosophy: If the candidate gets stuck on boilerplate, provide a quick nudge so they can demonstrate core logic.

## Dynamic Tool Calling
- Switch screens to the live code editor once approach is agreed upon:
  [TOOL_CALL: switch_category(category="code_editor", reason="Approach established")]
- Record recruiter observations on ambition or teamwork:
  [TOOL_CALL: record_recruiter_note(trait="career_ambition", quote="candidate quote", assessment="HR assessment")]
`;

const EVALUATOR_SAMPLE_TEMPLATE = `# Custom Report Evaluator Philosophy

## Evaluation Objective
- Produce an executive hiring evaluation for hiring managers and engineering leads.
- Score candidate competencies on a 0-100 scale: Architecture, Algorithmic Precision, Modularity, Communication.

## Recruiter Verdict
- Deliver a decisive verdict: STRONG_HIRE, HIRE, LEANING_NO, or NO_HIRE.
- Back up the verdict with verbatim candidate quotes and concrete rationale.

## Candidate Growth Roadmap
- Provide a 3-step practice plan highlighting exact topics and problem archetypes the candidate should practice.
`;

export default function SkillsManagerPage() {
  const { notify } = useAdminNotifications();
  const [skills, setSkills] = useState<AiSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "interviewer" | "evaluator" | "custom">("all");

  // View Modal state
  const [viewingSkill, setViewingSkill] = useState<AiSkill | null>(null);

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formType, setFormType] = useState<"interviewer" | "evaluator">("interviewer");
  const [formCategory, setFormCategory] = useState("System Architecture");
  const [formBadge, setFormBadge] = useState("Custom");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState(INTERVIEWER_SAMPLE_TEMPLATE);
  const [formFiles, setFormFiles] = useState<UploadedFile[]>([]);
  const [activeFileView, setActiveFileView] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/skills");
      if (!res.ok) throw new Error("Failed to load AI skills");
      const data = await res.json();
      setSkills(data.skills || []);
    } catch (err: any) {
      notify("error", "Failed to Load Skills", err.message || "Could not fetch skills", "FETCH_SKILLS");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingSkillId(null);
    setFormName("");
    setFormSlug("");
    setFormType("interviewer");
    setFormCategory("System Architecture");
    setFormBadge("Custom");
    setFormDescription("");
    setFormContent(INTERVIEWER_SAMPLE_TEMPLATE);
    setFormFiles([]);
    setActiveFileView(null);
    setPreviewMode("edit");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (skill: AiSkill) => {
    setEditingSkillId(skill.id);
    setFormName(skill.name);
    setFormSlug(skill.slug);
    setFormType(skill.type);
    setFormCategory(skill.category || "General");
    setFormBadge(skill.badge || "Custom");
    setFormDescription(skill.description || "");
    setFormContent(skill.content || "");
    setFormFiles(skill.files || []);
    setActiveFileView(null);
    setPreviewMode("edit");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Single Markdown File Upload
  const handleSingleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".md") && !file.name.endsWith(".markdown") && !file.name.endsWith(".txt")) {
      setFormError("Please upload a markdown (.md) or text file.");
      setIsModalOpen(true);
      return;
    }

    try {
      const text = await file.text();
      setFormContent(text);
      const derived = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const formattedName = derived.charAt(0).toUpperCase() + derived.slice(1);
      setFormName(formattedName);
      setFormSlug(derived.toLowerCase().replace(/\s+/g, "_"));
      setFormFiles([{ name: file.name, content: text, size: file.size }]);
      setActiveFileView(0);
      setFormError(null);
      setIsModalOpen(true);
      notify("info", "Markdown Loaded", `Imported ${file.name} successfully.`, "IMPORT_MD");
    } catch (err: any) {
      setFormError("Failed to read file: " + err.message);
      setIsModalOpen(true);
    } finally {
      e.target.value = "";
    }
  };

  // Folder / Multi-File Upload
  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    try {
      const validFiles: UploadedFile[] = [];
      let mergedContent = "";

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.name.endsWith(".md") || file.name.endsWith(".markdown") || file.name.endsWith(".txt")) {
          const text = await file.text();
          validFiles.push({ name: file.name, content: text, size: file.size });
          mergedContent += `\n\n# --- File: ${file.name} ---\n\n${text}`;
        }
      }

      if (validFiles.length === 0) {
        setFormError("No markdown (.md) files found in the selected folder.");
        setIsModalOpen(true);
        return;
      }

      setFormFiles(validFiles);
      setFormContent(mergedContent.trim());
      setActiveFileView(0);
      const folderName = (fileList[0].webkitRelativePath?.split("/")[0] || "Custom Rule Pack").replace(/[-_]/g, " ");
      setFormName(folderName.charAt(0).toUpperCase() + folderName.slice(1));
      setFormSlug(folderName.toLowerCase().replace(/\s+/g, "_"));
      setFormError(null);
      setIsModalOpen(true);
      notify(
        "success",
        "Folder Imported",
        `Imported ${validFiles.length} markdown file(s) from folder.`,
        "IMPORT_FOLDER"
      );
    } catch (err: any) {
      setFormError("Failed to read folder files: " + err.message);
      setIsModalOpen(true);
    } finally {
      e.target.value = "";
    }
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Skill name is required.");
      return;
    }
    if (!formContent.trim()) {
      setFormError("Skill markdown content is required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        type: formType,
        category: formCategory.trim() || "General",
        badge: formBadge.trim() || "Custom",
        description: formDescription.trim(),
        content: formContent.trim(),
        files: formFiles.length > 0 ? formFiles : undefined,
      };

      let res: Response;
      if (editingSkillId) {
        res = await fetch(`/api/admin/skills/${editingSkillId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save skill");

      setIsModalOpen(false);
      await fetchSkills();
      notify(
        "success",
        editingSkillId ? "Skill Updated" : "Skill Created",
        `"${payload.name}" is now ready for Job Roles and Studio.`,
        "SAVE_SKILL"
      );
    } catch (err: any) {
      setFormError(err.message || "Failed to save skill");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSkill = async (skill: AiSkill) => {
    if (skill.isBuiltIn) {
      alert("Built-in system skills cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${skill.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/skills/${skill.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete skill");

      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
      notify("info", "Skill Deleted", `Removed "${skill.name}" from library.`, "DELETE_SKILL");
    } catch (err: any) {
      notify("error", "Delete Failed", err.message || "Could not delete skill", "ERROR_SKILL");
    }
  };

  // Filter skills
  const filteredSkills = skills.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.badge && s.badge.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === "interviewer") return s.type === "interviewer";
    if (activeTab === "evaluator") return s.type === "evaluator";
    if (activeTab === "custom") return !s.isBuiltIn;
    return true;
  });

  const interviewerCount = skills.filter((s) => s.type === "interviewer").length;
  const evaluatorCount = skills.filter((s) => s.type === "evaluator").length;
  const customCount = skills.filter((s) => !s.isBuiltIn).length;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Hidden inputs for single markdown and folder upload */}
      <input
        type="file"
        ref={singleFileInputRef}
        onChange={handleSingleFileChange}
        accept=".md,.markdown,.txt"
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderChange}
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
        className="hidden"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Dual-Skill AI System
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Skills Manager
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Upload Markdown files or entire rule folders to create custom AI Personas and Evaluation Philosophies.
                Custom skills seamlessly plug into any Job Role for live interviews and candidate scorecards.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/admin/roles"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer shadow-xs"
              >
                <span>Job Roles</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
              <button
                type="button"
                onClick={() => singleFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-xs cursor-pointer"
                title="Upload single Markdown file (.md)"
              >
                <Upload className="w-3.5 h-3.5 text-primary" />
                <span>Upload .md</span>
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-xs cursor-pointer"
                title="Upload directory of rule files"
              >
                <FolderUp className="w-3.5 h-3.5 text-blue-500" />
                <span>Upload Folder</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Skill</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total AI Skills</span>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{skills.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Built-in & custom registry</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Interviewer Skills</span>
                <Zap className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{interviewerCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Live session & tool personas</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Evaluator Skills</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{evaluatorCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Scorecard & verdict rubrics</p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Custom Uploaded</span>
                <FolderUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground mt-2">{customCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Created via Markdown upload</p>
            </div>
          </div>

          {/* Controls: Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/50 border border-border/60 self-start">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "all"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Skills ({skills.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("interviewer")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "interviewer"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Interviewer ({interviewerCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("evaluator")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "evaluator"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Evaluator ({evaluatorCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === "custom"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Custom Markdown ({customCount})
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, slug, tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
              />
            </div>
          </div>

          {/* Skills Grid */}
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Loading AI skills...
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-border bg-card/50">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No Skills Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No AI skills matched your search. Upload a markdown file or create a new skill to get started.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Custom Skill</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSkills.map((skill) => {
                const isInterviewer = skill.type === "interviewer";
                return (
                  <div
                    key={skill.id}
                    className="flex flex-col justify-between p-5 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 transition-all group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isInterviewer
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {isInterviewer ? (
                            <Zap className="w-3 h-3 shrink-0" />
                          ) : (
                            <Award className="w-3 h-3 shrink-0" />
                          )}
                          <span>{isInterviewer ? "Live Interviewer" : "Report Evaluator"}</span>
                        </span>

                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            skill.isBuiltIn
                              ? "bg-secondary text-secondary-foreground border border-border"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-semibold"
                          }`}
                        >
                          {skill.isBuiltIn ? "Built-In" : "Custom Markdown"}
                        </span>
                      </div>

                      {/* Title & Slug */}
                      <h3 className="text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                        {skill.name}
                      </h3>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        slug: {skill.slug}
                      </p>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {skill.description || "Custom skill markdown rules loaded into dynamic AI context."}
                      </p>

                      {/* Category & Badge */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {skill.category && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                            {skill.category}
                          </span>
                        )}
                        {skill.badge && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                            {skill.badge}
                          </span>
                        )}
                        {skill.files && skill.files.length > 0 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                            <FolderUp className="w-2.5 h-2.5" />
                            <span>{skill.files.length} Files</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingSkill(skill)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Markdown</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {!skill.isBuiltIn && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(skill)}
                              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Edit Skill"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSkill(skill)}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              title="Delete Skill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* VIEW SKILL MARKDOWN MODAL */}
      {viewingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setViewingSkill(null)}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      viewingSkill.type === "interviewer"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    {viewingSkill.type === "interviewer" ? "Live Interviewer" : "Report Evaluator"}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">slug: {viewingSkill.slug}</span>
                </div>
                <h2 className="text-lg font-bold text-foreground">{viewingSkill.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingSkill(null)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If files list exists */}
            {viewingSkill.files && viewingSkill.files.length > 0 && (
              <div className="pt-3 pb-2 border-b border-border/40 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">Bundled Files:</span>
                {viewingSkill.files.map((f, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[11px] font-mono text-foreground border border-border/50"
                  >
                    <FileText className="w-2.5 h-2.5 text-primary" />
                    <span>{f.name}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto mt-4 pr-1">
              <pre className="text-xs font-mono p-4 rounded-lg bg-muted/60 border border-border/50 text-foreground whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {viewingSkill.content}
              </pre>
            </div>

            <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Injected into AI system instructions during interviews & reports.
              </span>
              <button
                type="button"
                onClick={() => setViewingSkill(null)}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SKILL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border/60">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingSkillId ? "Edit AI Skill" : "Upload & Create AI Skill"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Import Markdown file(s) or write rules governing the live AI persona or evaluation philosophy.
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSkill} className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
              {formError && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Skill Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google L5 Systems Specialist"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Skill Type *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const newT = e.target.value as "interviewer" | "evaluator";
                      setFormType(newT);
                      if (!formContent || formContent === INTERVIEWER_SAMPLE_TEMPLATE || formContent === EVALUATOR_SAMPLE_TEMPLATE) {
                        setFormContent(newT === "interviewer" ? INTERVIEWER_SAMPLE_TEMPLATE : EVALUATOR_SAMPLE_TEMPLATE);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="interviewer">Interviewer Skill (Live Voice & Chat Persona)</option>
                    <option value="evaluator">Evaluator Skill (Post-Interview Scoring & Report)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. System Architecture"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. High Rigor"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    System Slug (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="auto_generated_from_name"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="One sentence summary explaining when to use this skill..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Upload Tools Bar */}
              <div className="p-3 rounded-lg border border-border/80 bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Import Files:</span>
                  <button
                    type="button"
                    onClick={() => singleFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>Upload .md File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer shadow-xs"
                  >
                    <FolderUp className="w-3.5 h-3.5 text-blue-500" />
                    <span>Upload Folder</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormContent(
                        formType === "interviewer"
                          ? INTERVIEWER_SAMPLE_TEMPLATE
                          : EVALUATOR_SAMPLE_TEMPLATE
                      )
                    }
                    className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Load Sample Template
                  </button>
                </div>
              </div>

              {/* Multi-file preview tabs if folder was imported */}
              {formFiles.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-muted-foreground font-semibold shrink-0">Files ({formFiles.length}):</span>
                  {formFiles.map((f, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setActiveFileView(i);
                        setFormContent(f.content);
                      }}
                      className={`px-2.5 py-1 rounded-md border text-xs font-mono shrink-0 transition-colors cursor-pointer ${
                        activeFileView === i
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Markdown Content Editor / Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Markdown Instructions & Guidelines *
                  </label>
                  <div className="flex items-center gap-1 bg-muted p-0.5 rounded-md border border-border/50">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("edit")}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        previewMode === "edit"
                          ? "bg-card text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Raw Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("preview")}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        previewMode === "preview"
                          ? "bg-card text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Formatted View
                    </button>
                  </div>
                </div>

                {previewMode === "edit" ? (
                  <textarea
                    rows={12}
                    required
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Enter prompt instructions, guidelines, tool calling rules, or scoring rubrics..."
                    className="w-full p-3 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                  />
                ) : (
                  <div className="p-4 rounded-lg border border-border bg-muted/40 min-h-[220px] max-h-[320px] overflow-y-auto text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                    {formContent}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? "Saving..." : editingSkillId ? "Update Skill" : "Save Skill to Library"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
