"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

interface NavigationContextType {
  isNavigating: boolean;
  navigatingTarget: string | null;
  startNavigation: (target?: string) => void;
  stopNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  navigatingTarget: null,
  startNavigation: () => {},
  stopNavigation: () => {},
});

export function useNavigationLoading() {
  return useContext(NavigationContext);
}

function NavigationEvents({ onReset }: { onReset: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onReset();
  }, [pathname, searchParams, onReset]);

  return null;
}

export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTarget, setNavigatingTarget] = useState<string | null>(null);
  const pathname = usePathname();
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setNavigatingTarget(null);
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const startNavigation = useCallback((target?: string) => {
    setIsNavigating(true);
    if (target) setNavigatingTarget(target);

    // Safety timeout: automatically reset after 8 seconds in case of network issue or cancelled navigation
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = setTimeout(() => {
      setIsNavigating(false);
      setNavigatingTarget(null);
    }, 8000);
  }, []);

  // When pathname changes, navigation completed!
  useEffect(() => {
    stopNavigation();
  }, [pathname, stopNavigation]);

  // Intercept all internal <a> and <Link> clicks globally
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, downloads, new tabs, and hash anchors
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.getAttribute("target") === "_blank" ||
        target.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      try {
        const targetUrl = new URL(href, window.location.origin);
        const currentUrl = new URL(window.location.href);

        // Only trigger loading if navigating to a different page or query
        const isDifferentPath =
          targetUrl.pathname !== currentUrl.pathname ||
          targetUrl.search !== currentUrl.search;

        if (isDifferentPath) {
          startNavigation(targetUrl.pathname);
        }
      } catch {
        // Ignore invalid URLs
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    };
  }, [startNavigation]);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating,
        navigatingTarget,
        startNavigation,
        stopNavigation,
      }}
    >
      <Suspense fallback={null}>
        <NavigationEvents onReset={stopNavigation} />
      </Suspense>

      {/* Top slim animated loading progress bar */}
      {isNavigating && (
        <div
          className="fixed top-0 left-0 right-0 z-[10001] h-1 bg-muted overflow-hidden"
          role="progressbar"
          aria-label="Loading page"
        >
          <div className="h-full bg-primary animate-indeterminate origin-left" />
        </div>
      )}

      {/* Floating Centered Loading Pill + Click Blocker */}
      {isNavigating && (
        <>
          {/* Transparent click blocker: stops all other buttons from being clicked while loading */}
          <div
            className="fixed inset-0 z-[10000] cursor-wait bg-background/25 backdrop-blur-[1.5px] select-none pointer-events-auto"
            aria-hidden="true"
          />

          {/* Floating Pill indicator */}
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[10002] pointer-events-none flex items-center gap-2.5 px-4 py-2 rounded-full border border-border bg-card/95 text-foreground shadow-xl backdrop-blur-md text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <span>Loading...</span>
          </div>
        </>
      )}

      {/* The main view: subtly fades out during navigation and disables pointer events */}
      <div
        className={`min-h-full transition-opacity duration-200 ${
          isNavigating ? "opacity-60 pointer-events-none select-none" : "opacity-100"
        }`}
      >
        {children}
      </div>
    </NavigationContext.Provider>
  );
}
