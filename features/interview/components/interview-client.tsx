"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useInterviewStore, type TranscriptMessage } from "@/features/interview/store/interview-store";
import { ProblemPanel } from "./problem-panel";
import { ConversationPanel } from "./conversation-panel";
import { TextInput } from "./text-input";
import { VoiceControls } from "./voice-controls";
import { AIAvatar } from "./ai-avatar";
import { InterviewNav } from "./interview-nav";
import { CodeEditor } from "@/features/editor/components/code-editor";
import { EditorControls } from "@/features/editor/components/editor-controls";
import { VoiceInput } from "./voice-input";
import { HintButton } from "./hint-button";
import { InterviewLobby } from "./interview-lobby";
import { WarningToast } from "./warning-toast";
import { CameraPreview } from "./camera-preview";
import { ConversationRoomView } from "./conversation-room-view";
import { WhiteboardCanvas } from "./whiteboard-canvas";
import { OptionQuizPanel } from "./option-quiz-panel";
import { ResizableSplitter } from "@/components/resizable-splitter";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useTTS } from "@/hooks/use-tts";
import { useTabSwitchDetection } from "@/hooks/use-tab-switch-detection";
import { useFaceDetection } from "@/hooks/use-face-detection";

import { useRouter } from "next/navigation";
import { speakBackend } from "@/hooks/use-tts";

interface InterviewClientProps {
  interview: {
    id: string;
    language: string;
    difficulty: string;
    duration: number;
    status: string;
    problemTitle: string;
    problemDescription: string;
    code: string;
    tabSwitchCount?: number;
    outOfFrameCount?: number;
    startedAt: number | null;
    jobRoleId?: string | null;
    jobRole?: any;
  };
  existingMessages: TranscriptMessage[];
}

/**
 * Main interview layout — flexible, resizable panels.
 * Supports horizontal (side-by-side) and vertical (stacked) layouts.
 * Panels (problem, AI chat) are collapsible for a minimal interview experience.
 *
 * KEY ARCHITECTURE: useChatStream and useTTS hooks live HERE so they
 * never unmount during mode switches. Both TextInput and VoiceInput
 * are always mounted (hidden via CSS) to prevent remount issues.
 */
export function InterviewClient({
  interview,
  existingMessages,
}: InterviewClientProps) {
  const router = useRouter();
  const initInterview = useInterviewStore((s) => s.initInterview);
  const mode = useInterviewStore((s) => s.mode);
  const status = useInterviewStore((s) => s.status);
  const layoutMode = useInterviewStore((s) => s.layoutMode);
  const showProblem = useInterviewStore((s) => s.showProblem);
  const showAIPanel = useInterviewStore((s) => s.showAIPanel);
  const editorSplitPercent = useInterviewStore((s) => s.editorSplitPercent);
  const problemSplitPercent = useInterviewStore((s) => s.problemSplitPercent);
  const setEditorSplitPercent = useInterviewStore((s) => s.setEditorSplitPercent);
  const setProblemSplitPercent = useInterviewStore((s) => s.setProblemSplitPercent);

  const setStatus = useInterviewStore((s) => s.setStatus);
  const setTimerActive = useInterviewStore((s) => s.setTimerActive);
  const [lobbyCompleted, setLobbyCompleted] = useState(false);

  // ─── Proctoring: Tab Switch Detection ─────
  const isInterviewActive = status === "in_progress" && lobbyCompleted;
  const {
    tabSwitchCount,
    showWarning: showTabWarning,
    warningMessage: tabWarningMessage,
    dismissWarning: dismissTabWarning,
  } = useTabSwitchDetection({
    enabled: isInterviewActive,
    interviewId: interview.id,
    initialCount: interview.tabSwitchCount ?? 0,
  });

  const {
    showWarning: showFaceWarning,
    warningMessage: faceWarningMessage,
    outOfFrameCount,
    stream: cameraStream,
    dismissWarning: dismissFaceWarning,
  } = useFaceDetection({
    enabled: isInterviewActive,
    interviewId: interview.id,
    initialCount: interview.outOfFrameCount ?? 0,
    intervalMs: 500,
    missThreshold: 1,
    mode: mode,
  });

  const activeCategory = useInterviewStore((s) => s.activeCategory);

  // Listen for Dynamic AI tool calls (e.g. switch_category)
  useEffect(() => {
    const handleToolCall = (e: any) => {
      const { tool, args } = e.detail || {};
      if (tool === "switch_category" && args?.category) {
        const cat = args.category;
        if (["conversation", "code_editor", "drawing", "option_quiz"].includes(cat)) {
          console.log(`[Interview-Client] AI tool executed category switch to: ${cat}`);
          useInterviewStore.getState().setActiveCategory(cat as any);
        }
      }
    };
    window.addEventListener("ai-tool-call", handleToolCall);
    return () => window.removeEventListener("ai-tool-call", handleToolCall);
  }, []);

  // Advance to next stage / question (triggered by timer, AI, or button)
  const handleAdvanceToNextStage = useCallback(
    (isAutoSwitch: boolean = false) => {
      const s = useInterviewStore.getState();
      const list = s.questionsList;
      const nextIndex = s.currentQuestionIndex + 1;

      if (nextIndex < list.length) {
        const nextQ = list[nextIndex];
        s.setCurrentQuestion(nextQ, nextIndex);
        if (nextQ.category) {
          s.setActiveCategory(nextQ.category);
        }
        s.setCategoryTimeRemainingSeconds((nextQ.durationMinutes || 5) * 60);
        s.setSelectedOptionIndex(null);
        s.setQuizSubmitted(false);

        const transitionPrefix = isAutoSwitch
          ? `[Time Interval Expired] Auto-transitioning to ${nextQ.title || "next stage"}. `
          : `Transitioning to ${nextQ.title || "next stage"}. `;

        const promptAnnouncement = transitionPrefix + nextQ.promptText;
        s.addMessage("assistant", promptAnnouncement);

        if (!s.isSpeakerMuted) {
          s.setAIState("speaking");
          if (nextQ.audioUrl) {
            const audio = new Audio(nextQ.audioUrl);
            audio.onended = () => {
              const cur = useInterviewStore.getState();
              cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
            };
            audio.onerror = () => {
              speakBackend(nextQ.promptText, interview.id, () => {
                const cur = useInterviewStore.getState();
                cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
              });
            };
            audio.play().catch(() => {
              speakBackend(nextQ.promptText, interview.id, () => {
                const cur = useInterviewStore.getState();
                cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
              });
            });
          } else {
            speakBackend(nextQ.promptText, interview.id, () => {
              const cur = useInterviewStore.getState();
              cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
            });
          }
        }
      } else {
        s.addMessage(
          "assistant",
          "You have completed all stages of the interview. Feel free to review your work and submit when you are ready."
        );
      }
    },
    [interview.id]
  );

  // Category Auto-Switch Interval Countdown
  useEffect(() => {
    if (status !== "in_progress" || !lobbyCompleted) return;

    const timer = setInterval(() => {
      const s = useInterviewStore.getState();
      if (s.categoryTimeRemainingSeconds > 1) {
        s.setCategoryTimeRemainingSeconds(s.categoryTimeRemainingSeconds - 1);
      } else if (s.categoryTimeRemainingSeconds === 1) {
        s.setCategoryTimeRemainingSeconds(0);
        if (s.currentQuestion?.autoSwitch !== false) {
          handleAdvanceToNextStage(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, lobbyCompleted, handleAdvanceToNextStage]);

  // Handle Option Quiz Selection
  const handleQuizOptionSelected = useCallback(
    (selectedIdx: number, selectedText: string) => {
      const letter = String.fromCharCode(65 + selectedIdx);
      handleSendMessage(`I select Option ${letter}: ${selectedText}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [interview.id]
  );

  // Centralized TTS Hook
  const { bufferToken, flushAndFinish, resetTTS, stopAll: stopTTS } = useTTS();

  // Centralized Chat Stream Hook
  const streamCallbacks = useMemo(
    () => ({
      onToken: (token: string, isReasoning?: boolean) => {
        // Buffer tokens for TTS (skip reasoning tokens)
        if (!isReasoning) {
          bufferToken(token);
        }
      },
      onDone: (fullText: string) => {
        // Detect AI Category Switch Tool Call: [SWITCH_CATEGORY: category_name]
        const match = fullText.match(/\[SWITCH_CATEGORY:\s*(conversation|code_editor|drawing|option_quiz)\]/i);
        if (match) {
          const targetCategory = match[1].toLowerCase() as any;
          useInterviewStore.getState().setActiveCategory(targetCategory);
        }
        flushAndFinish();
      },
      onError: (_err: Error) => {
        stopTTS();
      },
    }),
    [bufferToken, flushAndFinish, stopTTS]
  );

  const { sendMessage, stopGeneration, isReconnecting } = useChatStream(streamCallbacks);

  // Stable sendMessage for child components supporting both Hybrid and Dynamic modes
  const handleSendMessage = useCallback(
    async (text: string) => {
      resetTTS(); // Clear any previous TTS state
      const state = useInterviewStore.getState();

      if (state.interviewMode === "hybrid" && state.currentQuestion) {
        // In Hybrid mode: candidate's answer is evaluated against admin rubric
        state.addMessage("user", text);
        state.setAIState("thinking");

        try {
          const res = await fetch(`/api/interviews/${interview.id}/evaluate-step`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId: state.currentQuestion.id,
              candidateAnswer: text,
              retryCount: state.questionRetryCount,
            }),
          });

          if (!res.ok) throw new Error("Step evaluation failed");
          const evalData = await res.json();

          const feedbackText = evalData.spokenFeedback || "Understood. Let's proceed.";
          state.addMessage("assistant", feedbackText);

          const shouldAdvance = evalData.shouldAdvance;
          const nextQ = evalData.nextQuestion;

          // AI speaks brief feedback or secondary angle
          if (!state.isSpeakerMuted) {
            state.setAIState("speaking");
            speakBackend(
              feedbackText,
              interview.id,
              () => {
                const s = useInterviewStore.getState();
                if (shouldAdvance && nextQ) {
                  // Transition to next question & category
                  s.setCurrentQuestion(nextQ, s.currentQuestionIndex + 1);
                  if (nextQ.category) {
                    s.setActiveCategory(nextQ.category);
                  }
                  s.setCategoryTimeRemainingSeconds((nextQ.durationMinutes || 5) * 60);
                  s.setSelectedOptionIndex(null);
                  s.setQuizSubmitted(false);
                  s.addMessage("assistant", nextQ.promptText);

                  // If next question has a pre-recorded audio file, play directly at $0 cost!
                  if (nextQ.audioUrl && !s.isSpeakerMuted) {
                    s.setAIState("speaking");
                    const audio = new Audio(nextQ.audioUrl);
                    audio.onended = () => {
                      const cur = useInterviewStore.getState();
                      cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
                    };
                    audio.onerror = () => {
                      speakBackend(nextQ.promptText, interview.id, () => {
                        const cur = useInterviewStore.getState();
                        cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
                      });
                    };
                    audio.play().catch(() => {
                      speakBackend(nextQ.promptText, interview.id, () => {
                        const cur = useInterviewStore.getState();
                        cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
                      });
                    });
                  } else if (!s.isSpeakerMuted) {
                    speakBackend(nextQ.promptText, interview.id, () => {
                      const cur = useInterviewStore.getState();
                      cur.setAIState(cur.mode === "voice" ? "listening" : "idle");
                    });
                  } else {
                    s.setAIState(s.mode === "voice" ? "listening" : "idle");
                  }
                } else if (shouldAdvance && !nextQ) {
                  // Final step completed
                  s.addMessage(
                    "assistant",
                    "You have completed all interview questions! Take your time to review your code and click Submit when ready."
                  );
                  s.setAIState(s.mode === "voice" ? "listening" : "idle");
                } else {
                  // Candidate answered partially/confused: increment probe count
                  s.setQuestionRetryCount(s.questionRetryCount + 1);
                  s.setAIState(s.mode === "voice" ? "listening" : "idle");
                }
              },
              () => {
                const s = useInterviewStore.getState();
                s.setAIState(s.mode === "voice" ? "listening" : "idle");
              }
            );
          } else {
            // Speaker is muted
            if (shouldAdvance && nextQ) {
              state.setCurrentQuestion(nextQ, state.currentQuestionIndex + 1);
              if (nextQ.category) {
                state.setActiveCategory(nextQ.category);
              }
              state.setCategoryTimeRemainingSeconds((nextQ.durationMinutes || 5) * 60);
              state.setSelectedOptionIndex(null);
              state.setQuizSubmitted(false);
              state.addMessage("assistant", nextQ.promptText);
            }
            state.setAIState(state.mode === "voice" ? "listening" : "idle");
          }
        } catch (err) {
          console.error("Hybrid step error, falling back to dynamic chat:", err);
          sendMessage(text);
        }
      } else {
        // In Dynamic mode: full conversational stream
        sendMessage(text);
      }
    },
    [interview.id, resetTTS, sendMessage]
  );

  const handleStopGeneration = useCallback(() => {
    stopGeneration();
    resetTTS();
  }, [stopGeneration, resetTTS]);

  // Global ESC keyboard shortcut to stop AI speaking or text generation
  useEffect(() => {
    function handleGlobalEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        stopTTS();
        handleStopGeneration();
      }
    }
    window.addEventListener("keydown", handleGlobalEsc);
    return () => window.removeEventListener("keydown", handleGlobalEsc);
  }, [stopTTS, handleStopGeneration]);



  // Redirect to report page when interview is completed
  useEffect(() => {
    if (status === "completed") {
      router.push(`/report/${interview.id}`);
    }
  }, [status, interview.id, router]);

  // Initialize the store on mount
  useEffect(() => {
    let computedTime: number | undefined = undefined;
    if (interview.startedAt && interview.status === "in_progress") {
      const elapsedMs = Date.now() - interview.startedAt;
      const totalMs = interview.duration * 60 * 1000;
      computedTime = Math.max(0, Math.floor((totalMs - elapsedMs) / 1000));
    } else if (interview.status === "setup") {
      computedTime = interview.duration * 60;
    }

    const isResuming = existingMessages.length > 0;

    initInterview({
      interviewId: interview.id,
      language: interview.language,
      difficulty: interview.difficulty,
      duration: interview.duration,
      problemTitle: interview.problemTitle,
      problemDescription: interview.problemDescription,
      code: interview.code,
      status: isResuming ? "in_progress" : "setup",
      timeRemainingSeconds: computedTime,
    });

    // Restore existing messages
    if (isResuming) {
      useInterviewStore.setState({ messages: existingMessages });
    }

    return () => {
      stopTTS();
      useInterviewStore.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle start/resume when lobby finishes
  const handleLobbyReady = (interviewStyle: string = "Standard") => {
    setLobbyCompleted(true);
    setStatus("in_progress");
    setTimerActive(true);

    // Prime speech synthesis on user gesture
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        const prime = new SpeechSynthesisUtterance("");
        window.speechSynthesis.speak(prime);
      } catch (e) {
        console.error("Failed to prime SpeechSynthesis:", e);
      }
    }

    if (existingMessages.length === 0) {
      async function startInterview() {
        const currentStore = useInterviewStore.getState();
        const selectedVoiceId = currentStore.selectedVoiceId;

        currentStore.setAIState("thinking");

        // 1. Check Studio Interview Mode and Structured Questions
        let studioMode = interview.jobRole?.mode || "hybrid";
        let activeQuestions: any[] = [];
        try {
          const roleParam = interview.jobRoleId ? `?jobRoleId=${encodeURIComponent(interview.jobRoleId)}` : "";
          const qRes = await fetch(`/api/admin/questions${roleParam}`);
          if (qRes.ok) {
            const qData = await qRes.json();
            studioMode = interview.jobRole?.mode || qData.interviewMode || "hybrid";
            activeQuestions = (qData.questions || []).filter((q: any) => q.isActive);
          }
        } catch (e) {
          console.warn("Could not load structured studio questions, continuing with dynamic fallback", e);
        }

        currentStore.setInterviewMode(studioMode as any);

        // If Hybrid mode with structured questions is active
        if (studioMode === "hybrid" && activeQuestions.length > 0) {
          const firstQ = activeQuestions[0];
          currentStore.setQuestionsList(activeQuestions);
          currentStore.setCurrentQuestion(firstQ, 0);
          if (firstQ.category) {
            currentStore.setActiveCategory(firstQ.category);
          }
          currentStore.setCategoryTimeRemainingSeconds((firstQ.durationMinutes || 5) * 60);
          currentStore.setCategoryTimerActive(true);

          const startMsgId = `msg-start-${Date.now()}`;
          useInterviewStore.setState({
            messages: [
              {
                id: startMsgId,
                role: "assistant",
                content: firstQ.promptText,
                timestamp: Date.now(),
              },
            ],
          });

          // Play static pre-recorded voice audio directly ($0 AI cost!)
          if (!currentStore.isSpeakerMuted) {
            currentStore.setAIState("speaking");
            if (firstQ.audioUrl) {
              const audio = new Audio(firstQ.audioUrl);
              audio.onended = () => {
                const s = useInterviewStore.getState();
                s.setAIState(s.mode === "voice" ? "listening" : "idle");
              };
              audio.onerror = () => {
                speakBackend(firstQ.promptText, interview.id, () => {
                  const s = useInterviewStore.getState();
                  s.setAIState(s.mode === "voice" ? "listening" : "idle");
                });
              };
              audio.play().catch(() => {
                speakBackend(firstQ.promptText, interview.id, () => {
                  const s = useInterviewStore.getState();
                  s.setAIState(s.mode === "voice" ? "listening" : "idle");
                });
              });
            } else {
              speakBackend(firstQ.promptText, interview.id, () => {
                const s = useInterviewStore.getState();
                s.setAIState(s.mode === "voice" ? "listening" : "idle");
              });
            }
          } else {
            currentStore.setAIState(currentStore.mode === "voice" ? "listening" : "idle");
          }
          return;
        }

        // 2. Fallback to Full Dynamic AI Mode
        const INDIAN_VOICE_NAME_MAP: Record<string, string> = {
          am_adam: "Aarav",
          am_michael: "Rohan",
          am_fenrir: "Vikram",
          am_puck: "Kabir",
          am_echo: "Aditya",
          af_heart: "Ananya",
          af_bella: "Diya",
          af_sarah: "Isha",
          af_nicole: "Kavya",
          af_sky: "Meera",
          if_sara: "Priya",
          minimax_male_presenter: "Dev",
          minimax_female_shaonv: "Riya",
          minimax_female_yujie: "Sanya",
          gemini_alloy: "Neer",
          gemini_echo: "Siddharth",
          gemini_onyx: "Varun",
          gemini_nova: "Tara",
          gemini_shimmer: "Neha",
          local_male: "System Male",
          local_female: "System Female",
        };

        const isFemale = selectedVoiceId && (selectedVoiceId.startsWith("af_") || selectedVoiceId.startsWith("if_") || selectedVoiceId.startsWith("bf_") || selectedVoiceId.includes("female") || selectedVoiceId === "gemini_nova" || selectedVoiceId === "gemini_shimmer");
        const mappedName = selectedVoiceId ? INDIAN_VOICE_NAME_MAP[selectedVoiceId] : undefined;
        const interviewerName = mappedName || (isFemale ? "Ananya" : "Aarav");

        let openingText = "";
        try {
          const res = await fetch(`/api/interviews/${interview.id}/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voiceId: selectedVoiceId, interviewStyle }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.message && data.message.trim()) {
              openingText = data.message;
            }
          }
        } catch (error) {
          console.error("Start interview error:", error);
        }

        if (!openingText) {
          openingText = `Hi, I'm ${interviewerName}. Welcome to your ${interview.difficulty} coding interview. Take a moment to read the problem, and when you're ready, share your initial thoughts on how you'd approach it.`;
        }

        const startMsgId = `msg-start-${Date.now()}`;
        useInterviewStore.setState({
          messages: [
            {
              id: startMsgId,
              role: "assistant",
              content: openingText,
              timestamp: Date.now(),
            },
          ],
        });

        // Speak the opening message
        if (!currentStore.isSpeakerMuted) {
          currentStore.setAIState("speaking");
          speakBackend(openingText, interview.id, () => {
            const s = useInterviewStore.getState();
            s.setAIState(s.mode === "voice" ? "listening" : "idle");
          }, () => {
            const s = useInterviewStore.getState();
            s.setAIState(s.mode === "voice" ? "listening" : "idle");
          });
        } else {
          currentStore.setAIState(currentStore.mode === "voice" ? "listening" : "idle");
        }
      }

      startInterview();
    }
  };

  // ─── Editor Panel (problem + code editor + controls) ──────

  const editorPanel = (
    <div className={`flex flex-1 overflow-hidden ${layoutMode === "horizontal" ? "flex-row" : "flex-col"}`}>
      {/* Problem description — collapsible */}
      {showProblem && (
        <>
          <div
            className={`overflow-auto border-border ${layoutMode === "horizontal" ? "border-r" : "border-b"}`}
            style={
              layoutMode === "horizontal"
                ? { width: `${problemSplitPercent}%` }
                : { height: `${problemSplitPercent}%` }
            }
          >
            <ProblemPanel />
          </div>
          <ResizableSplitter
            splitPercent={problemSplitPercent}
            onResize={setProblemSplitPercent}
            direction={layoutMode === "horizontal" ? "horizontal" : "vertical"}
            minFirst={15}
            maxFirst={60}
          />
        </>
      )}

      {/* Monaco Code Editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CodeEditor />

        {/* Run Code + Submit + Hint + Console */}
        <EditorControls>
          <HintButton />
        </EditorControls>
      </div>
    </div>
  );

  // ─── AI Panel (avatar, transcript, input) ─────────────────

  const aiPanel = showAIPanel ? (
    <div className="flex flex-col overflow-hidden" style={{ width: `${100 - editorSplitPercent}%` }}>
      {/* AI Avatar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <AIAvatar />
      </div>

      {/* Conversation Transcript */}
      <ConversationPanel />

      {/* Input Controls — BOTH always mounted, toggled via CSS */}
      {status === "in_progress" && (
        <>
          <div style={{ display: mode === "text" ? "block" : "none" }}>
            <TextInput sendMessage={handleSendMessage} stopGeneration={handleStopGeneration} />
          </div>
          <div style={{ display: mode === "voice" ? "block" : "none" }}>
            <VoiceInput sendMessage={handleSendMessage} stopGeneration={handleStopGeneration} />
          </div>
          <VoiceControls />
        </>
      )}

      {/* Completed state */}
      {status === "completed" && (
        <div className="flex items-center justify-center border-t border-border px-4 py-4">
          <p className="text-sm text-muted-foreground">
            Interview ended. Generating report...
          </p>
        </div>
      )}
    </div>
  ) : null;

  // ─── Floating chat bubble when AI panel is hidden ─────────

  const unreadBubble = !showAIPanel ? (
    <button
      onClick={() => useInterviewStore.getState().setShowAIPanel(true)}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-colors cursor-pointer"
      aria-label="Show AI panel"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  ) : null;

  if (!lobbyCompleted) {
    return <InterviewLobby onReady={handleLobbyReady} />;
  }

  // ─── Dynamic Category View Router ────────────────────────
  let categoryView = null;
  if (activeCategory === "conversation") {
    categoryView = <ConversationRoomView onNextCategory={() => handleAdvanceToNextStage(false)} />;
  } else if (activeCategory === "drawing") {
    categoryView = <WhiteboardCanvas onNextCategory={() => handleAdvanceToNextStage(false)} />;
  } else if (activeCategory === "option_quiz") {
    categoryView = (
      <OptionQuizPanel
        onOptionSelected={handleQuizOptionSelected}
        onNextCategory={() => handleAdvanceToNextStage(false)}
      />
    );
  } else {
    // Default "code_editor"
    categoryView = editorPanel;
  }

  // ─── Layout Render ────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col">
      {/* Top Navigation */}
      <InterviewNav />

      {/* Proctoring Warning Toasts */}
      <WarningToast
        message={tabWarningMessage}
        isVisible={showTabWarning}
        onDismiss={dismissTabWarning}
        durationMs={5000}
      />
      <WarningToast
        message={faceWarningMessage}
        isVisible={showFaceWarning && !showTabWarning}
        onDismiss={dismissFaceWarning}
        durationMs={5000}
      />

      {/* Network Drop Reconnection Toast */}
      {isReconnecting && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 rounded-lg px-5 py-3 shadow-xl border border-amber-500/40 bg-amber-600/90 text-white backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-100"></span>
            </span>
            <span className="text-sm font-semibold">Network connection dropped. Reconnecting to AI in 2s...</span>
          </div>
        </div>
      )}

      {/* Camera Preview Floating Window */}
      {isInterviewActive && <CameraPreview stream={cameraStream} />}

      {/* Proctoring Status Indicator */}
      {isInterviewActive && (tabSwitchCount > 0 || outOfFrameCount > 0) && (
        <div className="flex items-center justify-center gap-4 bg-red-500/10 border-b border-red-500/20 px-4 py-1.5 text-xs text-red-400">
          {tabSwitchCount > 0 && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Tab switches: {tabSwitchCount}
            </span>
          )}
          {outOfFrameCount > 0 && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Out of frame: {outOfFrameCount}
            </span>
          )}
        </div>
      )}

      {/* Main Content (Dynamic Category View on Left, AI Panel on Right) */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex flex-col overflow-hidden border-r border-border"
          style={{ width: showAIPanel ? `${editorSplitPercent}%` : "100%" }}
        >
          {categoryView}
        </div>

        {showAIPanel && (
          <ResizableSplitter
            splitPercent={editorSplitPercent}
            onResize={setEditorSplitPercent}
            direction="horizontal"
            minFirst={40}
            maxFirst={85}
          />
        )}

        {aiPanel}
      </div>

      {/* Floating bubble when AI panel is hidden */}
      {unreadBubble}
    </div>
  );
}

