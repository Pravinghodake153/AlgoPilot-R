"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Volume2,
  FileText,
  Palette,
  Key,
  Sliders,
} from "lucide-react";
import { useAdminNotifications } from "./admin-notification-system";
import { ThemeToggle } from "@/components/theme-toggle";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { notify } = useAdminNotifications();
  const [activeTab, setActiveTab] = useState<"interviewer" | "voice" | "report" | "appearance">("interviewer");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Settings State
  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [reportProvider, setReportProvider] = useState("gemini");
  const [reportModel, setReportModel] = useState("gemini-2.5-flash");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [zaiApiKey, setZaiApiKey] = useState("");
  const [openrouterApiKey, setOpenrouterApiKey] = useState("");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [showAiThinking, setShowAiThinking] = useState(true);
  const [ttsModel, setTtsModel] = useState("auto");
  const [ttsSpeed, setTtsSpeed] = useState("1.0");

  useEffect(() => {
    if (!isOpen) return;

    async function loadSettings() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin");
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};
          if (s.DEFAULT_AI_PROVIDER) setProvider(s.DEFAULT_AI_PROVIDER);
          if (s.DEFAULT_AI_MODEL) setModel(s.DEFAULT_AI_MODEL);
          if (s.REPORT_AI_PROVIDER) setReportProvider(s.REPORT_AI_PROVIDER);
          if (s.REPORT_AI_MODEL) setReportModel(s.REPORT_AI_MODEL);
          if (s.GEMINI_API_KEY) setGeminiApiKey(s.GEMINI_API_KEY);
          if (s.ZAI_API_KEY) setZaiApiKey(s.ZAI_API_KEY);
          if (s.OPENROUTER_API_KEY) setOpenrouterApiKey(s.OPENROUTER_API_KEY);
          if (s.DEEPSEEK_API_KEY) setDeepseekApiKey(s.DEEPSEEK_API_KEY);
          if (s.SHOW_AI_THINKING !== undefined) setShowAiThinking(s.SHOW_AI_THINKING === "true");
          if (s.TTS_MODEL) setTtsModel(s.TTS_MODEL);
          if (s.TTS_SPEED) setTtsSpeed(s.TTS_SPEED);
        }
      } catch (err: any) {
        notify("error", "Failed to Load", err.message || "Could not fetch settings", "ERROR_SETTINGS_LOAD");
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, [isOpen, notify]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          model,
          reportProvider,
          reportModel,
          geminiApiKey,
          zaiApiKey,
          openrouterApiKey,
          deepseekApiKey,
          showAiThinking,
          ttsModel,
          ttsSpeed,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      setSaveSuccess(true);
      notify("success", "Settings Saved", "System AI providers, keys, and speech parameters updated.", "UPDATE_SETTINGS");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      notify("error", "Save Failed", err.message || "Could not save system settings", "ERROR_SAVE");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      {/* 80% screen popup dialog */}
      <div
        className="flex flex-col w-[92vw] md:w-[82vw] max-w-5xl h-[86vh] max-h-[86vh] rounded-2xl border border-border bg-card text-foreground shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  System Settings
                </h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Admin Panel
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure AI providers, LLM API keys, speech models, and platform theme.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Embedded Theme Switcher */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2 py-1">
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">Theme:</span>
              <ThemeToggle showLabel />
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Tabs + Right Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Navigation Tabs */}
          <div className="w-56 border-r border-border bg-secondary/20 p-4 space-y-1.5 shrink-0 hidden sm:block">
            <button
              onClick={() => setActiveTab("interviewer")}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "interviewer"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Cpu className="h-4 w-4" />
              <span>Interviewer AI</span>
            </button>
            <button
              onClick={() => setActiveTab("voice")}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "voice"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Volume2 className="h-4 w-4" />
              <span>Voice & TTS AI</span>
            </button>
            <button
              onClick={() => setActiveTab("report")}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "report"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Report Evaluator</span>
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "appearance"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Palette className="h-4 w-4" />
              <span>Appearance & Theme</span>
            </button>
          </div>

          {/* Right Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <p className="text-sm text-muted-foreground animate-pulse">Loading current configuration...</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl">
                {/* Mobile Tab Selector */}
                <div className="flex items-center gap-1 border-b border-border pb-3 sm:hidden overflow-x-auto">
                  {(["interviewer", "voice", "report", "appearance"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap capitalize ${
                        activeTab === tab
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Interviewer AI */}
                {activeTab === "interviewer" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Interviewer Model & Engine</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Controls the AI interviewer that asks questions and analyzes candidate code.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Active Provider</label>
                        <select
                          value={provider}
                          onChange={(e) => setProvider(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="gemini">Google Gemini (Default)</option>
                          <option value="zai">Z.AI (GLM-4 / BigModel)</option>
                          <option value="openrouter">OpenRouter (Multi-model)</option>
                          <option value="deepseek">DeepSeek (Official)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Model Identifier</label>
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="e.g. gemini-2.5-flash or glm-4"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    {/* AI Thinking Process Switch */}
                    <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-4">
                      <div>
                        <h4 className="text-xs font-semibold text-foreground">Live AI Reasoning / Thinking</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Display the AI interviewer's internal reasoning process inside expandable bubbles.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={showAiThinking}
                        onChange={(e) => setShowAiThinking(e.target.checked)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer"
                      />
                    </div>

                    {/* API Keys Configuration */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Provider API Keys
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground">Google Gemini API Key</label>
                          <input
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground">Z.AI (BigModel) Key</label>
                          <input
                            type="password"
                            value={zaiApiKey}
                            onChange={(e) => setZaiApiKey(e.target.value)}
                            placeholder="511ba8c0..."
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground">OpenRouter API Key</label>
                          <input
                            type="password"
                            value={openrouterApiKey}
                            onChange={(e) => setOpenrouterApiKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-foreground">DeepSeek Official Key</label>
                          <input
                            type="password"
                            value={deepseekApiKey}
                            onChange={(e) => setDeepseekApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Voice & TTS */}
                {activeTab === "voice" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Speech & Audio Synthesis</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure voice models, Indian voice regional routes, and speech tempo.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Default Voice TTS Model</label>
                        <select
                          value={ttsModel}
                          onChange={(e) => setTtsModel(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="auto">Auto-detect (By Voice Character Name)</option>
                          <option value="hexgrad/kokoro-82m">Kokoro 82M (Fast & Natural Indian English)</option>
                          <option value="minimax/speech-2.8-turbo">MiniMax 2.8 Turbo (Expressive)</option>
                          <option value="google/gemini-3.1-flash-tts-preview">Gemini 3.1 Flash TTS Preview</option>
                          <option value="openai/tts-1">OpenAI TTS 1</option>
                        </select>
                        <p className="text-[11px] text-muted-foreground">
                          Auto-detect maps voices like Aarav, Rohan, Ananya, and Neer to their optimal underlying engine.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Speech Speed Multiplier</label>
                        <select
                          value={ttsSpeed}
                          onChange={(e) => setTtsSpeed(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="0.85">0.85x (Slower / Relaxed)</option>
                          <option value="0.90">0.90x (Slightly Slower)</option>
                          <option value="0.95">0.95x (Natural Conversational Pace)</option>
                          <option value="1.0">1.00x (Standard Normal Speed)</option>
                          <option value="1.05">1.05x (Brisk Pace)</option>
                          <option value="1.10">1.10x (Faster)</option>
                          <option value="1.15">1.15x (Fastest)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Report Evaluator */}
                {activeTab === "report" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Report AI Evaluator</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Model dedicated to grading interviews, computing technical score, and generating feedback reports.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Report Provider</label>
                        <select
                          value={reportProvider}
                          onChange={(e) => setReportProvider(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="gemini">Google Gemini (Recommended for Reports)</option>
                          <option value="zai">Z.AI (BigModel)</option>
                          <option value="openrouter">OpenRouter</option>
                          <option value="deepseek">DeepSeek</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Report Model Identifier</label>
                        <input
                          type="text"
                          value={reportModel}
                          onChange={(e) => setReportModel(e.target.value)}
                          placeholder="e.g. gemini-2.5-flash"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Appearance & Theme */}
                {activeTab === "appearance" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Theme & Visual Experience</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose between High-Contrast Bright Theme and Obsidian Dark Theme.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-secondary/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">Platform Theme Mode</h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md">
                          Bright theme provides high-contrast typography (WCAG AAA compliant), crisp pearl surfaces, and dynamic light Monaco editor.
                        </p>
                      </div>

                      <ThemeToggle showLabel className="h-10 px-4 text-sm font-semibold" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Settings saved successfully!
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
