"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SUPPORTED_LANGUAGES, INTERVIEW_DURATIONS, INTERVIEW_STYLES } from "@/types";
import { Loader2, Briefcase, Check } from "lucide-react";
import { useNavigationLoading } from "@/components/navigation-loading-provider";

interface StartInterviewModalProps {
  onClose: () => void;
}

interface RoleOption {
  id: string;
  title: string;
  department: string | null;
  level: string | null;
  targetSkills: string | null;
  isDefault: boolean;
  questionCount: number;
}

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
] as const;

/**
 * Interview configuration modal.
 * Collects: Job Role, Language, Difficulty, Style, Duration.
 * Then calls POST /api/interviews to create a new interview session.
 */
export function StartInterviewModal({ onClose }: StartInterviewModalProps) {
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [language, setLanguage] = useState("python");
  const [difficulty, setDifficulty] = useState("medium");
  const [style, setStyle] = useState("standard");
  const [duration, setDuration] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available roles
  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch("/api/roles");
        if (res.ok) {
          const data = await res.json();
          const roleList: RoleOption[] = data.roles || [];
          setRoles(roleList);
          const def = roleList.find((r) => r.isDefault) || roleList[0];
          if (def) setSelectedRoleId(def.id);
        }
      } catch (e) {
        console.warn("Could not fetch job roles", e);
      }
    }
    fetchRoles();
  }, []);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onClose();
    },
    [onClose, isLoading]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function handleStart() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          difficulty,
          style,
          duration,
          jobRoleId: selectedRoleId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create interview");
      }

      const data = await response.json();
      const targetUrl = `/interview/${data.interview.id}`;
      startNavigation(targetUrl);
      router.push(targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Configure Interview Session
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select your target job role and interview parameters.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer"
            aria-label="Close modal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {/* Target Job Role */}
          {roles.length > 0 && (
            <fieldset>
              <div className="flex items-center justify-between mb-2">
                <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-primary" />
                  <span>Target Job Role</span>
                </legend>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {roles.length} roles available
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                {roles.map((r) => {
                  const isSelected = selectedRoleId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setSelectedRoleId(r.id)}
                      className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                        isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                      } ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                          : "border-border hover:border-foreground/30 bg-card hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {r.title}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground">
                        {r.department && <span>{r.department}</span>}
                        {r.department && r.level && <span>•</span>}
                        {r.level && <span className="font-medium text-foreground/80">{r.level}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedRole?.targetSkills && (
                <div className="mt-2.5 p-2 rounded-md bg-muted/40 border border-border/40 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground/90">Skills Evaluated: </span>
                  <span>{selectedRole.targetSkills}</span>
                </div>
              )}
            </fieldset>
          )}

          {/* Language */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Primary Language
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setLanguage(lang.id)}
                  className={`flex h-9 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                    isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                  } ${
                    language === lang.id
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Difficulty */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Difficulty
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex h-9 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                    isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                  } ${
                    difficulty === opt.value
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Style */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Interview Style
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {INTERVIEW_STYLES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setStyle(opt.value)}
                  className={`flex h-9 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                    isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                  } ${
                    style === opt.value
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Duration */}
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Session Duration
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {INTERVIEW_DURATIONS.map((dur) => (
                <button
                  key={dur.value}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setDuration(dur.value)}
                  className={`flex h-9 items-center justify-center rounded-md border text-xs font-semibold transition-colors ${
                    isLoading ? "pointer-events-none opacity-60" : "cursor-pointer"
                  } ${
                    duration === dur.value
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {dur.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-xs font-medium text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-9 rounded-md px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={isLoading}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-6 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-wait shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin shrink-0" />
                <span>Preparing Session...</span>
              </>
            ) : (
              "Start Interview"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
