"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/features/admin/components/sidebar";
import { useAdminNotifications } from "@/features/admin/components/admin-notification-system";
import {
  Mic,
  RotateCw,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Sparkles,
  Layers,
  HelpCircle,
  Save,
  ArrowRight,
  Clock,
  Code2,
  MessageSquare,
  Square,
  Check,
  Zap,
  Award,
  Wrench,
  Briefcase,
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
  hybridVoice: string;
  interviewerSkill: string;
  evaluatorSkill: string;
  targetSkills: string | null;
  isDefault: boolean;
  _count?: { questions: number };
}

interface Question {
  id: string;
  order: number;
  stage: string;
  category?: string; // "conversation" | "code_editor" | "drawing" | "option_quiz"
  durationMinutes?: number;
  autoSwitch?: boolean;
  allowAiSwitch?: boolean;
  options?: string[];
  correctOption?: number | null;
  explanation?: string | null;
  title: string;
  promptText: string;
  audioUrl: string | null;
  audioSource: string;
  expectedRubric: string[];
  secondaryProbe: string | null;
  maxProbes: number;
  isActive: boolean;
}

const VOICE_OPTIONS = [
  { id: "af_heart", name: "Sarah (Warm Female - Kokoro)" },
  { id: "af_bella", name: "Bella (Professional Female - Kokoro)" },
  { id: "am_adam", name: "Aarav (Professional Male - Kokoro)" },
  { id: "am_michael", name: "Rohan (Clear Male - Kokoro)" },
  { id: "gemini_nova", name: "Nova (Conversational Female - OpenAI)" },
  { id: "gemini_echo", name: "Siddharth (Calm Male - OpenAI)" },
  { id: "minimax_female_shaonv", name: "Riya (Expressive Female - MiniMax)" },
  { id: "minimax_male_presenter", name: "Dev (Presenter Male - MiniMax)" },
];

const CATEGORY_OPTIONS = [
  {
    value: "conversation",
    label: "Conversation & Behavioral",
    badge: "Conversation",
    icon: MessageSquare,
    description: "Speech discussion stage with AI avatar & candidate video. No code editor.",
  },
  {
    value: "code_editor",
    label: "Code Editor (Live Coding)",
    badge: "Code Editor",
    icon: Code2,
    description: "Monaco code editor with compiler runner, problem constraints, and tests.",
  },
  {
    value: "drawing",
    label: "Whiteboard Drawing",
    badge: "Whiteboard",
    icon: Square,
    description: "Interactive canvas for architecture, system design, and flowcharts.",
  },
  {
    value: "option_quiz",
    label: "Option-Based Quiz (Max 4 Options)",
    badge: "Quiz",
    icon: HelpCircle,
    description: "Multiple choice question with clickable options A, B, C, D and answer check.",
  },
];

const STAGE_OPTIONS = [
  { value: "intro", label: "1. Intro & Problem Reading" },
  { value: "approach", label: "2. Algorithmic Approach" },
  { value: "coding", label: "3. Live Code Implementation" },
  { value: "complexity", label: "4. Complexity & Scalability" },
  { value: "wrapup", label: "5. Wrap-Up & Candidate Q&A" },
];

interface StudioSkill {
  id: string;
  name: string;
  slug: string;
  badge?: string;
  description?: string;
  recommendedFor?: string;
  verdictFocus?: string;
  isBuiltIn: boolean;
}

function VoiceStudioContent() {
  const { notify } = useAdminNotifications();
  const searchParams = useSearchParams();
  const initialRoleId = searchParams.get("roleId") || "";

  const [roles, setRoles] = useState<JobRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>(initialRoleId);
  const [interviewMode, setInterviewMode] = useState<"hybrid" | "dynamic">("hybrid");
  const [hybridVoice, setHybridVoice] = useState("af_heart");
  const [interviewerSkill, setInterviewerSkill] = useState("startup_pragmatist");
  const [evaluatorSkill, setEvaluatorSkill] = useState("executive_committee");
  const [targetSkills, setTargetSkills] = useState("System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership");
  const [interviewerSkillsList, setInterviewerSkillsList] = useState<StudioSkill[]>([]);
  const [evaluatorSkillsList, setEvaluatorSkillsList] = useState<StudioSkill[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New question form state
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [newRubricPoint, setNewRubricPoint] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const fetchStudioData = async (roleIdToUse?: string) => {
    try {
      setLoading(true);
      const activeId = roleIdToUse !== undefined ? roleIdToUse : selectedRoleId;

      const fetchPromises: Promise<Response>[] = [
        fetch("/api/admin/roles"),
        fetch("/api/skills"),
      ];

      if (activeId) {
        fetchPromises.push(fetch(`/api/admin/questions?jobRoleId=${encodeURIComponent(activeId)}`));
      }

      const results = await Promise.all(fetchPromises);
      const rolesRes = results[0];
      const skillsRes = results[1];
      const qRes = results[2];

      let loadedRoles: JobRole[] = [];
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        loadedRoles = rolesData.roles || [];
        setRoles(loadedRoles);
      }

      if (skillsRes.ok) {
        const skillsData = await skillsRes.json();
        if (skillsData.interviewers) setInterviewerSkillsList(skillsData.interviewers);
        if (skillsData.evaluators) setEvaluatorSkillsList(skillsData.evaluators);
      }

      if (activeId && qRes && qRes.ok) {
        const data = await qRes.json();
        setQuestions(data.questions || []);

        const activeRole = loadedRoles.find((r) => r.id === activeId);
        if (activeRole) {
          setInterviewMode((activeRole.mode as "hybrid" | "dynamic") || "hybrid");
          setHybridVoice(activeRole.hybridVoice || "af_heart");
          setInterviewerSkill(activeRole.interviewerSkill || "startup_pragmatist");
          setEvaluatorSkill(activeRole.evaluatorSkill || "executive_committee");
          setTargetSkills(activeRole.targetSkills || "System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership");
        }
      } else {
        setQuestions([]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load questions";
      setStatusMessage({ type: "error", text: message });
      notify("error", "Fetch Failed", message, "ERROR_STUDIO");
    } finally {
      setLoading(false);
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    fetchStudioData(initialRoleId);
  }, [initialRoleId]);

  const handleRoleChange = async (newRoleId: string) => {
    setSelectedRoleId(newRoleId);
    if (!newRoleId) {
      setQuestions([]);
      return;
    }

    setRoleLoading(true);
    setStatusMessage(null);

    const targetRole = roles.find((r) => r.id === newRoleId);
    if (targetRole) {
      setInterviewMode(targetRole.mode === "dynamic" ? "dynamic" : "hybrid");
      setHybridVoice(targetRole.hybridVoice || "af_heart");
      setInterviewerSkill(targetRole.interviewerSkill || "startup_pragmatist");
      setEvaluatorSkill(targetRole.evaluatorSkill || "executive_committee");
      setTargetSkills(targetRole.targetSkills || "System Architecture, Big-O Complexity, Code Modularity, Ambition & Ownership");
    }

    try {
      const qRes = await fetch(`/api/admin/questions?jobRoleId=${encodeURIComponent(newRoleId)}`);
      if (qRes.ok) {
        const data = await qRes.json();
        setQuestions(data.questions || []);
      } else {
        throw new Error("Failed to load questions for selected role");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load role questions";
      setStatusMessage({ type: "error", text: message });
      notify("error", "Fetch Failed", message, "ERROR_STUDIO");
    } finally {
      setRoleLoading(false);
    }
  };

  const handleSaveRoleSettings = async (
    newVoice?: string,
    newInterviewerSkill?: string,
    newEvaluatorSkill?: string,
    newTargetSkills?: string
  ) => {
    setSavingSkills(true);
    setStatusMessage(null);
    try {
      const payload = {
        mode: interviewMode,
        hybridVoice: newVoice || hybridVoice,
        interviewerSkill: newInterviewerSkill || interviewerSkill,
        evaluatorSkill: newEvaluatorSkill || evaluatorSkill,
        targetSkills: newTargetSkills !== undefined ? newTargetSkills : targetSkills,
      };

      // If a role is currently selected, update that role directly
      if (selectedRoleId) {
        await fetch(`/api/admin/roles/${selectedRoleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setRoles((prev) =>
          prev.map((r) => (r.id === selectedRoleId ? { ...r, ...payload } : r))
        );
      }

      // Also update system setting
      const res = await fetch("/api/admin/interview-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save role configuration");

      if (newVoice) setHybridVoice(newVoice);
      if (newInterviewerSkill) setInterviewerSkill(newInterviewerSkill);
      if (newEvaluatorSkill) setEvaluatorSkill(newEvaluatorSkill);
      if (newTargetSkills !== undefined) setTargetSkills(newTargetSkills);

      const currentRole = roles.find((r) => r.id === selectedRoleId);
      const roleText = currentRole ? ` for role "${currentRole.title}"` : "";
      setStatusMessage({
        type: "success",
        text: `Configuration saved${roleText}`,
      });
      notify("success", "Configuration Saved", `Active settings saved${roleText}.`, "UPDATE_MODE");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save configuration";
      setStatusMessage({ type: "error", text: message });
      notify("error", "Save Failed", message, "ERROR_MODE");
    } finally {
      setSavingSkills(false);
    }
  };

  const handleGenerateVoice = async (question: Question) => {
    setGeneratingId(question.id);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/questions/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          text: question.promptText,
          voice: hybridVoice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      // Update question in local state
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === question.id
            ? { ...q, audioUrl: data.audioUrl, audioSource: "generated" }
            : q
        )
      );

      setStatusMessage({
        type: "success",
        text: `Pre-recorded voice audio generated for "${question.title}"! Saved to disk.`,
      });
      notify("success", "Voice Generated", `Audio file saved to disk for "${question.title}".`, "GENERATE_VOICE");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Voice generation failed";
      setStatusMessage({ type: "error", text: message });
      notify("error", "Voice Generation Failed", message, "ERROR_VOICE");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleUploadClick = (questionId: string) => {
    setUploadTargetId(questionId);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    const formData = new FormData();
    formData.append("questionId", uploadTargetId);
    formData.append("file", file);

    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/questions/upload-voice", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === uploadTargetId
            ? { ...q, audioUrl: data.audioUrl, audioSource: "uploaded" }
            : q
        )
      );

      setStatusMessage({
        type: "success",
        text: "Custom audio file uploaded and linked successfully!",
      });
      notify("success", "Audio Uploaded", "Custom audio file uploaded and linked to question.", "UPLOAD_VOICE");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Audio upload failed";
      setStatusMessage({ type: "error", text: message });
      notify("error", "Upload Failed", message, "ERROR_UPLOAD");
    } finally {
      setUploadTargetId(null);
    }
  };

  const handleSaveQuestion = async (q: Partial<Question>) => {
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...q,
          jobRoleId: selectedRoleId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      if (q.id) {
        setQuestions((prev) =>
          prev.map((item) => (item.id === q.id ? data.question : item))
        );
      } else {
        setQuestions((prev) => [...prev, data.question]);
      }

      setEditingQuestion(null);
      setStatusMessage({ type: "success", text: "Question details saved." });
      notify("success", "Question Saved", `Question "${q.title || "details"}" and rubric saved.`, "SAVE_QUESTION");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save question";
      setStatusMessage({ type: "error", text: message });
      notify("error", "Save Failed", message, "ERROR_QUESTION");
    }
  };

  const handleLoadStandardTemplate = async () => {
    if (!selectedRoleId) return;
    try {
      setRoleLoading(true);
      setStatusMessage(null);
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "load_standard_template",
          jobRoleId: selectedRoleId,
        }),
      });
      if (!res.ok) throw new Error("Failed to load standard template questions");
      const data = await res.json();
      setQuestions(data.questions || []);
      setStatusMessage({ type: "success", text: "Standard 5 Multi-Category Questions loaded successfully." });
      notify("success", "Template Loaded", "Loaded 5 sequential questions with rubrics & quiz options.", "LOAD_TEMPLATE");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load template questions";
      setStatusMessage({ type: "error", text: message });
      notify("error", "Template Failed", message, "ERROR_TEMPLATE");
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/admin/questions?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setQuestions((prev) => {
        const remaining = prev.filter((q) => q.id !== id);
        return remaining.map((q, i) => {
          const cleanTitle = (q.title || "").replace(/^\d+[\.\:\-]\s*/, "");
          return {
            ...q,
            order: i + 1,
            title: `${i + 1}. ${cleanTitle}`,
          };
        });
      });
      setStatusMessage({ type: "success", text: "Question deleted. Remaining steps updated to Step 1, 2, ..." });
      notify("success", "Question Deleted", "Question removed and step sequence updated.", "DELETE_QUESTION");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete question";
      setStatusMessage({ type: "error", text: message });
      notify("error", "Delete Failed", message, "ERROR_DELETE");
    }
  };

  const addRubricPointToEditing = () => {
    if (!newRubricPoint.trim() || !editingQuestion) return;
    const currentRubrics = editingQuestion.expectedRubric || [];
    setEditingQuestion({
      ...editingQuestion,
      expectedRubric: [...currentRubrics, newRubricPoint.trim()],
    });
    setNewRubricPoint("");
  };

  const removeRubricPointFromEditing = (index: number) => {
    if (!editingQuestion || !editingQuestion.expectedRubric) return;
    const updated = editingQuestion.expectedRubric.filter((_, i) => i !== index);
    setEditingQuestion({
      ...editingQuestion,
      expectedRubric: updated,
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 overflow-y-auto" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="audio/*"
        className="hidden"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                A to Z Interview Architecture
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Interview Studio & Multi-Category Flow Manager
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Configure every stage of candidate interviews from A to Z. Mix and match Conversation, Live Code Editor,
              Whiteboard Drawing, and Multiple-Choice Quizzes with automated duration timers and dynamic AI tool transitions.
            </p>
          </div>

          {/* Active Job Role Selector Bar */}
          <div className="p-4 rounded-xl border border-border bg-card/70 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Job Role:
                  </span>
                  {(() => {
                    const currentRole = roles.find((r) => r.id === selectedRoleId);
                    if (!currentRole) {
                      return (
                        <span className="text-xs text-muted-foreground italic">
                          Select a role from the dropdown to load its studio configuration
                        </span>
                      );
                    }
                    return (
                      <>
                        {currentRole?.department && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                            {currentRole.department}
                          </span>
                        )}
                        {currentRole?.level && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {currentRole.level}
                          </span>
                        )}
                        {interviewMode === "dynamic" ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            Full Dynamic AI Mode
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-emerald-500" />
                            Structured Hybrid Mode
                          </span>
                        )}
                        {currentRole?.isDefault && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            Default Role
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={selectedRoleId}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="text-base font-bold bg-transparent text-foreground border-b border-border/70 hover:border-foreground/50 focus:outline-none cursor-pointer py-0.5 pr-6"
                  >
                    <option value="" className="bg-popover text-popover-foreground">
                      -- Select a Job Role to open --
                    </option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id} className="bg-popover text-popover-foreground">
                        {r.title} — {r.mode === "dynamic" ? "Dynamic AI" : "Hybrid Voice"} {r.isDefault ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/roles"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-xs"
              >
                <span>Job Roles</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>

          {/* Differentiated Content Area: Blank if no role selected, or roleLoading indicator */}
          {roleLoading ? (
            <div className="py-24 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Loading role questions & configuration...</p>
            </div>
          ) : selectedRoleId ? (
            <>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 border ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium"
                  : "bg-destructive/10 border-destructive/20 text-destructive font-medium"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{statusMessage.text}</span>
            </div>
          )}

          {/* Mode Details Banner */}
          <div className="p-4 rounded-xl border border-border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg shrink-0 ${
                  interviewMode === "dynamic"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {interviewMode === "dynamic" ? (
                  <Sparkles className="w-5 h-5" />
                ) : (
                  <Layers className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {interviewMode === "dynamic" ? "Full Dynamic AI Mode" : "Structured Hybrid Mode"}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-muted text-muted-foreground border border-border">
                    {interviewMode === "dynamic" ? "Autonomous Reasoning" : "$0 Voice Cost"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {interviewMode === "dynamic"
                    ? "AI generates questions and tests depth dynamically in real-time. Manual static questions are not required."
                    : "Pre-recorded question audio and structured rubric stages. Configure sequential questions and voice clips below."}
                </p>
              </div>
            </div>

            <div className="text-right text-[11px] text-muted-foreground shrink-0 border-t sm:border-t-0 sm:border-l border-border/50 pt-2 sm:pt-0 sm:pl-4">
              <span>Mode is locked to this role.</span>
              <br />
              <Link href="/admin/roles" className="text-primary hover:underline font-medium inline-flex items-center gap-1 mt-0.5">
                Manage roles in Job Roles
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Dual-Skill & Voice Configuration (Universal for BOTH Hybrid & Dynamic!) */}
          <div className="p-6 rounded-xl border border-border bg-card shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    Dual-Skill System
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active for {interviewMode === "dynamic" ? "Dynamic AI" : "Hybrid Mode"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mt-1.5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Dual-Skill Architecture & Voice Configuration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {interviewMode === "dynamic"
                    ? "Skill 1 conducts unscripted live probing and tool actions. Skill 2 calculates the executive scorecard and roadmap."
                    : "Skill 1 guides the interviewer's vocal personality, hints, and adaptive secondary probes. Skill 2 calculates the executive scorecard and roadmap."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveRoleSettings(hybridVoice, interviewerSkill, evaluatorSkill, targetSkills)}
                  disabled={savingSkills}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition flex items-center gap-2 shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingSkills ? "Saving..." : "Save Role Settings"}
                </button>
              </div>
            </div>

            {/* Voice Persona Picker */}
            <div className="p-3.5 rounded-lg border border-border/80 bg-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                  AI Interviewer Voice Persona
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  The spoken voice used for question synthesis and dynamic adaptive probing.
                </p>
              </div>
              <select
                value={hybridVoice}
                onChange={(e) => {
                  const newVoice = e.target.value;
                  setHybridVoice(newVoice);
                  handleSaveRoleSettings(newVoice, interviewerSkill, evaluatorSkill, targetSkills);
                }}
                className="bg-card text-foreground text-xs rounded-md border border-border px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Skill 1: Live Interviewer Persona */}
              <div className="p-4 rounded-lg border border-border bg-secondary/30 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-primary" />
                      Skill 1: Live Interviewer Persona
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {interviewMode === "dynamic" ? "Live Conversations & Tools" : "Vocal Persona & Hints"}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Select Active Interviewer Skill</label>
                    <select
                      value={interviewerSkill}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInterviewerSkill(val);
                        handleSaveRoleSettings(hybridVoice, val, evaluatorSkill, targetSkills);
                      }}
                      className="w-full bg-card text-foreground text-xs font-medium rounded-lg border border-border p-2.5 outline-none focus:ring-1 focus:ring-primary"
                    >
                      {interviewerSkillsList.length > 0
                        ? interviewerSkillsList.map((sk) => (
                            <option key={sk.slug} value={sk.slug}>
                              {sk.name} {!sk.isBuiltIn ? "(Custom)" : ""}
                            </option>
                          ))
                        : Object.values(INTERVIEWER_SKILLS).map((sk) => (
                            <option key={sk.id} value={sk.id}>
                              {sk.name} — {sk.subtitle}
                            </option>
                          ))}
                    </select>
                  </div>

                  {/* Skill 1 Details Preview */}
                  {(() => {
                    const activeSkill =
                      interviewerSkillsList.find((s) => s.slug === interviewerSkill) ||
                      INTERVIEWER_SKILLS[interviewerSkill];
                    if (!activeSkill) return null;
                    return (
                      <div className="p-3 rounded-md bg-card/60 border border-border/60 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {activeSkill.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            {activeSkill.badge || "Skill"}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {activeSkill.description || "Custom skill markdown rules loaded into dynamic AI context."}
                        </p>
                        {(activeSkill as StudioSkill).recommendedFor && (
                          <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                            <strong>Best For:</strong> {(activeSkill as StudioSkill).recommendedFor}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Active Tool Calling Badges */}
                <div className="pt-3 border-t border-border/50">
                  <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Wrench className="w-3 h-3 text-primary" />
                    Interview Guidance & Tools:
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      switch_category (Editor &bull; Whiteboard &bull; Quiz)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      record_recruiter_note (Career Ambition Quotes)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      give_progressive_hint (Socratic Nudges)
                    </span>
                  </div>
                </div>
              </div>

              {/* Skill 2: Post-Interview Report Evaluator */}
              <div className="p-4 rounded-lg border border-border bg-secondary/30 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Skill 2: Report Evaluator Skill
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Executive Verdict & Roadmap
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Select Active Evaluator Skill</label>
                    <select
                      value={evaluatorSkill}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEvaluatorSkill(val);
                        handleSaveRoleSettings(hybridVoice, interviewerSkill, val, targetSkills);
                      }}
                      className="w-full bg-card text-foreground text-xs font-medium rounded-lg border border-border p-2.5 outline-none focus:ring-1 focus:ring-primary"
                    >
                      {evaluatorSkillsList.length > 0
                        ? evaluatorSkillsList.map((sk) => (
                            <option key={sk.slug} value={sk.slug}>
                              {sk.name} {!sk.isBuiltIn ? "(Custom)" : ""}
                            </option>
                          ))
                        : Object.values(REPORT_EVALUATOR_SKILLS).map((sk) => (
                            <option key={sk.id} value={sk.id}>
                              {sk.name} — {sk.subtitle}
                            </option>
                          ))}
                    </select>
                  </div>

                  {/* Skill 2 Details Preview */}
                  {(() => {
                    const activeSkill =
                      evaluatorSkillsList.find((s) => s.slug === evaluatorSkill) ||
                      REPORT_EVALUATOR_SKILLS[evaluatorSkill];
                    if (!activeSkill) return null;
                    return (
                      <div className="p-3 rounded-md bg-card/60 border border-border/60 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {activeSkill.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            {activeSkill.badge || "Skill"}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {activeSkill.description || "Custom evaluator rubric loaded into report generation."}
                        </p>
                        {(activeSkill as StudioSkill).verdictFocus && (
                          <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                            <strong>Verdict Focus:</strong> {(activeSkill as StudioSkill).verdictFocus}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Active Report Outputs */}
                <div className="pt-3 border-t border-border/50">
                  <div className="text-[11px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Executive Report Artifacts:
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Executive Recruiter Card (Hire / No Hire)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Subjective Career Quotes & Ambition Analysis
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      3-Step Candidate Learning Roadmap
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Skills to Assess */}
            <div className="p-4 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Target Skills to Assess During Interview
                </label>
                <span className="text-[10px] text-muted-foreground">
                  Comma-separated list evaluated on the 0-100 scorecard
                </span>
              </div>
              <input
                type="text"
                value={targetSkills}
                onChange={(e) => setTargetSkills(e.target.value)}
                onBlur={() => handleSaveRoleSettings(hybridVoice, interviewerSkill, evaluatorSkill, targetSkills)}
                placeholder="e.g. System Architecture, Big-O Complexity, Code Modularity, Career Ambition & Ownership"
                className="w-full bg-secondary/50 text-foreground text-xs rounded-lg border border-border px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-primary font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                The interviewer tests candidate competencies across these topics and calculates a 0-100 score for each on the final executive scorecard.
              </p>
            </div>
          </div>

          {/* Differentiated Lower Content: Hybrid Questions vs Dynamic AI Engine */}
          {interviewMode === "dynamic" ? (
            /* DYNAMIC AI ENGINE VIEW — NO ADD QUESTION BUTTON */
            <div className="p-8 rounded-xl border border-blue-500/30 bg-card/90 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      Dynamic AI Pipeline Active
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                      0 Manual Questions Needed
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Autonomous Dynamic AI Engine
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                    In Full Dynamic AI Mode, questions are not manually authored or static. The AI interviewer autonomously designs questions, tests edge cases, evaluates real-time code, and guides candidate whiteboard architecture using the 2 assigned skills and target competencies.
                  </p>
                </div>
              </div>

              {/* 4 Core Dynamic Engine Capabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Adaptive Questioning</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    AI adjusts question difficulty dynamically based on candidate code speed, depth, and clarity.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Live Tool Calling</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Autonomous screen switching between Monaco live code editor, Excalidraw whiteboard, and quiz.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Recruiter Quotes</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Captures verbatim quotes on career vision, teamwork, and culture fit during conversation.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">Executive Scorecard</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Synthesizes 0-100 competency scores, decisive hiring verdict, and 3-step growth roadmap.
                  </p>
                </div>
              </div>

              {/* Live Persona Prompt Rules Preview */}
              <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Active AI System Prompt Persona Instructions
                </span>
                <pre className="text-xs font-mono p-3 rounded-lg bg-background border border-border text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {interviewerSkillsList.find((s) => s.slug === interviewerSkill)?.description ||
                    INTERVIEWER_SKILLS[interviewerSkill]?.promptInstructions ||
                    "Interviewer skill prompt loaded."}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Structured Questions & Rubric</h2>
                <p className="text-xs text-muted-foreground">
                  Define the sequential questions, pre-recorded audio, and expected answer criteria.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadStandardTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer shadow-xs"
                  title="Load or reset standard 5 multi-category questions (Conversation, Quiz, Whiteboard, Coding, Wrap-up)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Load Standard 5 Template</span>
                </button>
                <button
                  onClick={() =>
                    setEditingQuestion({
                      order: questions.length + 1,
                      stage: "approach",
                      category: "conversation",
                      durationMinutes: 5,
                      autoSwitch: true,
                      allowAiSwitch: true,
                      title: `${questions.length + 1}. New Interview Stage`,
                      promptText: "",
                      options: ["Option A", "Option B", "Option C", "Option D"],
                      correctOption: 0,
                      explanation: "",
                      expectedRubric: [],
                      secondaryProbe: "",
                      maxProbes: 1,
                      isActive: true,
                    })
                  }
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Question
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading questions...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-10 border border-dashed border-border rounded-xl text-center space-y-3 bg-card/40">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No Questions in Interview Flow</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  You can load the Standard 5 Multi-Category Questions Template (Conversation, Quiz, Whiteboard, Live Coding, Wrap-up) or add questions manually.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLoadStandardTemplate}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Load Standard 5 Questions Template</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const isGenerating = generatingId === q.id;
                  const hasAudio = !!q.audioUrl;
                  const cleanTitle = (q.title || "").replace(/^\d+[\.\:\-]\s*/, "");

                  return (
                    <div
                      key={q.id}
                      className="p-5 rounded-xl border border-border bg-card space-y-4"
                    >
                      {/* Top Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            Step {idx + 1}
                          </span>
                          {/* Category Badge */}
                          {(() => {
                            const cat = CATEGORY_OPTIONS.find((c) => c.value === (q.category || "code_editor")) || CATEGORY_OPTIONS[1];
                            const Icon = cat.icon;
                            return (
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5" />
                                <span>{cat.badge}</span>
                              </span>
                            );
                          })()}
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{q.durationMinutes || 5} min</span>
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${q.autoSwitch !== false ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
                            Auto-Switch: {q.autoSwitch !== false ? "ON" : "OFF"}
                          </span>
                          <h3 className="font-semibold text-foreground text-sm ml-1">
                            {idx + 1}. {cleanTitle}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingQuestion(q)}
                            className="px-2.5 py-1 text-xs rounded border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                          >
                            Edit Details
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                            title="Delete question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Prompt Text */}
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Spoken Question Prompt:
                        </span>
                        <p className="text-sm text-foreground mt-1 bg-secondary/30 p-3 rounded-lg border border-border/40">
                          &ldquo;{q.promptText}&rdquo;
                        </p>
                      </div>

                      {/* Option Quiz Choices Display */}
                      {q.category === "option_quiz" && Array.isArray(q.options) && q.options.length > 0 && (
                        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1.5 text-xs">
                          <span className="font-semibold text-foreground">Quiz Options (Max 4):</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {q.options.slice(0, 4).map((opt, i) => {
                              const isCorrect = q.correctOption === i;
                              return (
                                <div
                                  key={i}
                                  className={`flex items-center gap-2 p-2 rounded border ${
                                    isCorrect
                                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                                      : "border-border/40 bg-card text-muted-foreground"
                                  }`}
                                >
                                  <span className="font-mono font-bold text-xs">
                                    {String.fromCharCode(65 + i)}.
                                  </span>
                                  <span className="truncate flex-1">{opt}</span>
                                  {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                          {q.explanation && (
                            <p className="text-[11px] text-muted-foreground pt-1 italic">
                              Concept Note: {q.explanation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Audio Controls */}
                      <div className="p-3.5 rounded-lg bg-secondary/40 border border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              hasAudio
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            <Mic className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-foreground">
                                {hasAudio ? "Voice Audio Ready" : "No Audio Generated"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({q.audioSource})
                              </span>
                            </div>
                            {hasAudio && (
                              <audio
                                controls
                                src={q.audioUrl || undefined}
                                className="h-7 mt-1.5 max-w-xs"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleGenerateVoice(q)}
                            disabled={isGenerating}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            <RotateCw
                              className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`}
                            />
                            {hasAudio ? "Re-generate Voice" : "1-Click Generate Voice"}
                          </button>

                          <button
                            onClick={() => handleUploadClick(q.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-foreground hover:bg-secondary/80 border border-border transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Upload MP3
                          </button>
                        </div>
                      </div>

                      {/* Rubric Points & Secondary Angle */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Expected Answer Rubric (Key Concepts):
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {q.expectedRubric && q.expectedRubric.length > 0 ? (
                              q.expectedRubric.map((r, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border"
                                >
                                  {r}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                No specific rubric items defined.
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-medium text-muted-foreground">
                            Secondary Angle (Probe if confused/partial):
                          </span>
                          <p className="text-xs text-foreground mt-1 italic bg-background/50 p-2 rounded border border-border/40">
                            {q.secondaryProbe || "None specified (moves directly to next question)"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

          {/* Edit/Create Question Modal */}
          {editingQuestion && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-semibold text-foreground text-lg">
                    {editingQuestion.id ? "Edit Question" : "Create New Question"}
                  </h3>
                  <button
                    onClick={() => setEditingQuestion(null)}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Title */}
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Question Title</label>
                    <input
                      type="text"
                      value={editingQuestion.title || ""}
                      onChange={(e) =>
                        setEditingQuestion({ ...editingQuestion, title: e.target.value })
                      }
                      className="w-full bg-secondary text-foreground p-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. Approach: Two Sum"
                    />
                  </div>
                  {/* Category & Stage Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>Interview Category (UI Mode)</span>
                      </label>
                      <select
                        value={editingQuestion.category || "code_editor"}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          setEditingQuestion({
                            ...editingQuestion,
                            category: newCat,
                            options:
                              newCat === "option_quiz" && (!editingQuestion.options || editingQuestion.options.length === 0)
                                ? ["Option A", "Option B", "Option C", "Option D"]
                                : editingQuestion.options,
                            correctOption:
                              newCat === "option_quiz" && typeof editingQuestion.correctOption !== "number"
                                ? 0
                                : editingQuestion.correctOption,
                          });
                        }}
                        className="w-full bg-secondary text-foreground p-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary font-medium"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground">
                        {CATEGORY_OPTIONS.find((c) => c.value === (editingQuestion.category || "code_editor"))?.description}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Interview Progression Stage</label>
                      <select
                        value={editingQuestion.stage || "approach"}
                        onChange={(e) =>
                          setEditingQuestion({ ...editingQuestion, stage: e.target.value })
                        }
                        className="w-full bg-secondary text-foreground p-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
                      >
                        {STAGE_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Interval Duration & Auto-Switch Settings */}
                  <div className="p-3 rounded-lg border border-border/60 bg-secondary/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>Stage Interval & Auto Category Switch</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">Duration (Minutes)</label>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={editingQuestion.durationMinutes || 5}
                          onChange={(e) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              durationMinutes: parseInt(e.target.value) || 5,
                            })
                          }
                          className="w-full bg-card text-foreground p-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id="autoSwitchCheck"
                          checked={editingQuestion.autoSwitch !== false}
                          onChange={(e) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              autoSwitch: e.target.checked,
                            })
                          }
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="autoSwitchCheck" className="text-xs text-foreground cursor-pointer select-none">
                          Auto-Switch on Timer Expiry
                        </label>
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          id="allowAiSwitchCheck"
                          checked={editingQuestion.allowAiSwitch !== false}
                          onChange={(e) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              allowAiSwitch: e.target.checked,
                            })
                          }
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="allowAiSwitchCheck" className="text-xs text-foreground cursor-pointer select-none">
                          Allow AI Tool Call Switch
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Option-Based Question Editor (When category is option_quiz) */}
                  {editingQuestion.category === "option_quiz" && (
                    <div className="p-3.5 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-3">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold text-foreground text-xs">
                          Multiple Choice Options (Max 4 Options)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {["A", "B", "C", "D"].map((letter, idx) => {
                          const currentOpts = editingQuestion.options || ["", "", "", ""];
                          const isCorrect = editingQuestion.correctOption === idx;

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-foreground">
                                  Option {letter}
                                </label>
                                <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                                  <input
                                    type="radio"
                                    name="correctOptionRadio"
                                    checked={isCorrect}
                                    onChange={() =>
                                      setEditingQuestion({
                                        ...editingQuestion,
                                        correctOption: idx,
                                      })
                                    }
                                    className="cursor-pointer"
                                  />
                                  <span>Correct Answer</span>
                                </label>
                              </div>
                              <input
                                type="text"
                                value={currentOpts[idx] || ""}
                                onChange={(e) => {
                                  const updated = [...currentOpts];
                                  updated[idx] = e.target.value;
                                  setEditingQuestion({
                                    ...editingQuestion,
                                    options: updated,
                                  });
                                }}
                                placeholder={`Text for Option ${letter}`}
                                className="w-full bg-card text-foreground p-2 rounded border border-border outline-none focus:ring-1 focus:ring-purple-400"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] font-medium text-foreground">
                          Answer Explanation / Concept Note
                        </label>
                        <input
                          type="text"
                          value={editingQuestion.explanation || ""}
                          onChange={(e) =>
                            setEditingQuestion({
                              ...editingQuestion,
                              explanation: e.target.value,
                            })
                          }
                          placeholder="Brief explanation shown after candidate submits their choice"
                          className="w-full bg-card text-foreground p-1.5 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Prompt Text */}
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Spoken Question Prompt (What the candidate hears)
                    </label>
                    <textarea
                      rows={3}
                      value={editingQuestion.promptText || ""}
                      onChange={(e) =>
                        setEditingQuestion({ ...editingQuestion, promptText: e.target.value })
                      }
                      className="w-full bg-secondary text-foreground p-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Write the clear, professional question prompt here..."
                    />
                  </div>

                  {/* Rubric Points */}
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Expected Answer Points (What the candidate must mention)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRubricPoint}
                        onChange={(e) => setNewRubricPoint(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addRubricPointToEditing();
                          }
                        }}
                        className="flex-1 bg-secondary text-foreground p-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
                        placeholder="e.g. Mentions Hash Map for O(1) lookups"
                      />
                      <button
                        type="button"
                        onClick={addRubricPointToEditing}
                        className="px-3 py-1.5 rounded bg-primary text-primary-foreground font-medium"
                      >
                        Add Point
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {editingQuestion.expectedRubric?.map((r, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-secondary-foreground border border-border"
                        >
                          <span>{r}</span>
                          <button
                            type="button"
                            onClick={() => removeRubricPointFromEditing(i)}
                            className="hover:text-destructive text-muted-foreground ml-1 font-bold"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Secondary Probe */}
                  <div className="space-y-1">
                    <label className="font-medium text-foreground">
                      Secondary Probing Angle (If candidate is confused / partial)
                    </label>
                    <textarea
                      rows={2}
                      value={editingQuestion.secondaryProbe || ""}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          secondaryProbe: e.target.value,
                        })
                      }
                      className="w-full bg-secondary text-foreground p-2 rounded border border-border outline-none focus:ring-1 focus:ring-primary"
                      placeholder="e.g. If candidate misses edge cases, ask: 'What happens if the input has duplicate numbers?'"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <button
                    onClick={() => setEditingQuestion(null)}
                    className="px-3 py-1.5 rounded border border-border text-foreground hover:bg-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveQuestion(editingQuestion)}
                    className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Question
                  </button>
                </div>
              </div>
            </div>
          )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function VoiceStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 overflow-y-auto" />
        </div>
      }
    >
      <VoiceStudioContent />
    </Suspense>
  );
}
