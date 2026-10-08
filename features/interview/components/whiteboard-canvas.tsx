"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useInterviewStore } from "@/features/interview/store/interview-store";
import {
  Pencil,
  Eraser,
  Square,
  Circle,
  Minus,
  MoveRight,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Clock,
  Sparkles,
  ChevronRight,
  Maximize2,
} from "lucide-react";

type ToolType = "pen" | "eraser" | "rect" | "circle" | "line" | "arrow";

interface WhiteboardCanvasProps {
  onNextCategory?: () => void;
}

export function WhiteboardCanvas({ onNextCategory }: WhiteboardCanvasProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const canvasBgColor = isLight ? "#ffffff" : "#090d16";
  const gridDotColor = isLight ? "#cbd5e1" : "#1e293b";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentQuestion = useInterviewStore((s) => s.currentQuestion);
  const currentQuestionIndex = useInterviewStore((s) => s.currentQuestionIndex);
  const questionsList = useInterviewStore((s) => s.questionsList);
  const categoryTimeRemainingSeconds = useInterviewStore((s) => s.categoryTimeRemainingSeconds);
  const setDrawingData = useInterviewStore((s) => s.setDrawingData);

  const [activeTool, setActiveTool] = useState<ToolType>("pen");
  const [strokeColor, setStrokeColor] = useState<string>(isLight ? "#2563eb" : "#38bdf8");
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Automatically update default ink when theme toggles if user was on default ink
  useEffect(() => {
    if (isLight && (strokeColor === "#38bdf8" || strokeColor === "#f8fafc")) {
      setStrokeColor("#2563eb");
    } else if (!isLight && (strokeColor === "#2563eb" || strokeColor === "#0f172a")) {
      setStrokeColor("#38bdf8");
    }
  }, [isLight]);

  const COLORS = isLight
    ? [
        { name: "Slate", value: "#0f172a" },
        { name: "Blue", value: "#2563eb" },
        { name: "Emerald", value: "#059669" },
        { name: "Amber", value: "#d97706" },
        { name: "Rose", value: "#e11d48" },
        { name: "Purple", value: "#7c3aed" },
      ]
    : [
        { name: "Cyan", value: "#38bdf8" },
        { name: "Emerald", value: "#34d399" },
        { name: "Amber", value: "#fbbf24" },
        { name: "Rose", value: "#fb7185" },
        { name: "Purple", value: "#c084fc" },
        { name: "White", value: "#f8fafc" },
      ];

  const formatTimer = (secs: number) => {
    const mins = Math.floor(Math.max(0, secs) / 60);
    const rem = Math.max(0, secs) % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  // Resize canvas to fill container while preserving existing drawings
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // Save current content if already initialized
    const ctx = canvas.getContext("2d");
    let prevImage: ImageData | null = null;
    if (canvas.width > 0 && canvas.height > 0 && ctx) {
      try {
        prevImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch {
        /* ignore */
      }
    }

    canvas.width = rect.width;
    canvas.height = rect.height;

    if (ctx) {
      // Dynamic canvas background (crisp white in light mode, obsidian slate in dark mode)
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint dot grid for architectural precision
      ctx.fillStyle = gridDotColor;
      const dotSpacing = 24;
      for (let x = dotSpacing; x < canvas.width; x += dotSpacing) {
        for (let y = dotSpacing; y < canvas.height; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (prevImage) {
        ctx.putImageData(prevImage, 0, 0);
      }
    }
  }, [canvasBgColor, gridDotColor]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Save state to undo history
  const pushState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imgData);
    if (newHistory.length > 25) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Also persist data URL to store
    try {
      setDrawingData(canvas.toDataURL());
    } catch {
      /* ignore */
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && history[nextIdx]) {
        ctx.putImageData(history[nextIdx], 0, 0);
        setHistoryIndex(nextIdx);
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx && history[nextIdx]) {
        ctx.putImageData(history[nextIdx], 0, 0);
        setHistoryIndex(nextIdx);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = canvasBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw faint dot grid
    ctx.fillStyle = gridDotColor;
    const dotSpacing = 24;
    for (let x = dotSpacing; x < canvas.width; x += dotSpacing) {
      for (let y = dotSpacing; y < canvas.height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    pushState();
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(coords);

    // Take snapshot for shape drawing preview
    setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));

    if (activeTool === "pen" || activeTool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = activeTool === "eraser" ? canvasBgColor : strokeColor;
      ctx.lineWidth = activeTool === "eraser" ? lineWidth * 4 : lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentCoords = getCanvasCoords(e);

    if (activeTool === "pen" || activeTool === "eraser") {
      ctx.lineTo(currentCoords.x, currentCoords.y);
      ctx.stroke();
    } else if (snapshot && startPos) {
      // Restore previous state before drawing preview shape
      ctx.putImageData(snapshot, 0, 0);

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (activeTool === "rect") {
        const width = currentCoords.x - startPos.x;
        const height = currentCoords.y - startPos.y;
        ctx.strokeRect(startPos.x, startPos.y, width, height);
      } else if (activeTool === "circle") {
        const radius = Math.hypot(currentCoords.x - startPos.x, currentCoords.y - startPos.y);
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeTool === "line") {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentCoords.x, currentCoords.y);
        ctx.stroke();
      } else if (activeTool === "arrow") {
        // Draw main line
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentCoords.x, currentCoords.y);
        ctx.stroke();

        // Draw arrow head
        const angle = Math.atan2(currentCoords.y - startPos.y, currentCoords.x - startPos.x);
        const headlen = Math.max(10, lineWidth * 3);
        ctx.beginPath();
        ctx.moveTo(currentCoords.x, currentCoords.y);
        ctx.lineTo(
          currentCoords.x - headlen * Math.cos(angle - Math.PI / 6),
          currentCoords.y - headlen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(currentCoords.x, currentCoords.y);
        ctx.lineTo(
          currentCoords.x - headlen * Math.cos(angle + Math.PI / 6),
          currentCoords.y - headlen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStartPos(null);
      setSnapshot(null);
      pushState();
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-design-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Top Bar: Question Header & Timer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-card/60 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Square className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                Stage {currentQuestionIndex + 1} of {Math.max(1, questionsList.length)}
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                System Design & Whiteboard
              </span>
            </div>
            <h2 className="text-sm font-bold text-foreground truncate max-w-md">
              {currentQuestion?.title || "Architecture & Diagram Canvas"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stage Timer */}
          <div className="flex items-center gap-2 rounded-md border border-border/80 bg-secondary/40 px-2.5 py-1 text-xs">
            <Clock className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
            <span className="font-mono font-bold text-foreground">
              {formatTimer(categoryTimeRemainingSeconds)}
            </span>
          </div>

          {onNextCategory && (
            <button
              onClick={onNextCategory}
              className="inline-flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-sky-600 transition-colors cursor-pointer"
            >
              <span>Next Stage</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Prompt Banner */}
      {currentQuestion?.promptText && (
        <div className="border-b border-border/50 bg-secondary/20 px-4 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-sky-400 shrink-0" />
          <span className="truncate">{currentQuestion.promptText}</span>
        </div>
      )}

      {/* Canvas Toolset Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-card/40 px-4 py-2">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTool("pen")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              activeTool === "pen" ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "text-muted-foreground hover:bg-secondary"
            }`}
            title="Freehand Pencil"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveTool("rect")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              activeTool === "rect" ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "text-muted-foreground hover:bg-secondary"
            }`}
            title="Box / Rectangle"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveTool("circle")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              activeTool === "circle" ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "text-muted-foreground hover:bg-secondary"
            }`}
            title="Circle / Node"
          >
            <Circle className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveTool("line")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              activeTool === "line" ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "text-muted-foreground hover:bg-secondary"
            }`}
            title="Straight Line"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveTool("arrow")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              activeTool === "arrow" ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "text-muted-foreground hover:bg-secondary"
            }`}
            title="Directional Arrow"
          >
            <MoveRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setActiveTool("eraser")}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              activeTool === "eraser" ? "bg-sky-500/20 text-sky-400 border border-sky-500/40" : "text-muted-foreground hover:bg-secondary"
            }`}
            title="Eraser"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setStrokeColor(c.value)}
              className={`h-5 w-5 rounded-full border transition-transform cursor-pointer ${
                strokeColor === c.value ? "scale-125 border-foreground ring-2 ring-primary/60" : "border-border hover:scale-110"
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        {/* Stroke Width Selector */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {[2, 4, 7].map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                lineWidth === w ? "bg-sky-500/20 text-sky-400 font-bold" : "hover:bg-secondary"
              }`}
            >
              {w === 2 ? "Fine" : w === 4 ? "Med" : "Bold"}
            </button>
          ))}
        </div>

        {/* Undo, Redo, Clear & Export */}
        <div className="flex items-center gap-1 border-l border-border/60 pl-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-40 cursor-pointer"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 cursor-pointer"
            title="Clear Board"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary cursor-pointer"
            title="Download PNG Snapshot"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div ref={containerRef} className="relative flex-1 w-full overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="absolute inset-0 block h-full w-full"
        />
      </div>
    </div>
  );
}
