"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Laptop } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by waiting until mounted on client
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/50 text-muted-foreground ${className}`}
        aria-hidden="true"
      >
        <div className="h-4 w-4" />
      </div>
    );
  }

  const isLight = resolvedTheme === "light";

  const toggleTheme = () => {
    setTheme(isLight ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-xs transition-all duration-200 hover:bg-secondary hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer ${className}`}
      aria-label={isLight ? "Switch to dark theme" : "Switch to bright theme"}
      title={isLight ? "Switch to Dark Theme" : "Switch to Bright Theme (High Contrast)"}
    >
      {isLight ? (
        <Sun className="h-4 w-4 text-amber-500 transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-sky-400 transition-transform duration-300 group-hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="font-medium">
          {isLight ? "Bright" : "Dark"}
        </span>
      )}
    </button>
  );
}
