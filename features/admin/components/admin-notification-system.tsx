"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  Shield,
  Clock,
  Filter,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export interface NotificationItem {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
  action?: string | null;
  createdAt: string;
}

interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

interface NotificationContextType {
  notify: (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    action?: string
  ) => void;
  openDrawer: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useAdminNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useAdminNotifications must be used within AdminNotificationProvider");
  }
  return context;
}

export function AdminNotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [history, setHistory] = useState<NotificationItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [unreadCount, setUnreadCount] = useState(0);

  // Load last 10 days notifications from database
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.notifications || []);
      }
    } catch {
      /* ignore load error */
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const notify = useCallback(
    (type: "success" | "error" | "info", title: string, message: string, action?: string) => {
      const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      
      // 1. Add active floating pop-up toast
      setToasts((prev) => [...prev, { id: toastId, type, title, message }]);

      // 2. Increment unread bell counter
      setUnreadCount((c) => c + 1);

      // 3. Auto-remove toast after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 4000);

      // 4. Persist to immutable database audit log
      fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title, message, action }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.notification) {
            setHistory((prev) => [data.notification, ...prev]);
          }
        })
        .catch(() => {
          // Add locally if offline
          setHistory((prev) => [
            {
              id: toastId,
              type,
              title,
              message,
              action,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        });
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openDrawer = () => {
    setIsDrawerOpen(true);
    setUnreadCount(0); // Mark as read
    loadHistory();
  };

  const filteredHistory = history.filter((item) => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  return (
    <NotificationContext.Provider value={{ notify, openDrawer, unreadCount }}>
      {children}

      {/* Floating Dark Pop-up Toasts (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";

          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/95 text-zinc-100 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
            >
              {/* Type SVG Icon */}
              <div
                className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                  isSuccess
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : isError
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isError ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Info className="w-4 h-4" />
                )}
              </div>

              {/* Text Body */}
              <div className="flex-1 min-w-0 pr-1">
                <h4 className="text-xs font-semibold text-zinc-100 tracking-tight">
                  {toast.title}
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed break-words">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Slide-Over Notification History Drawer (Immutable 10 Days) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-secondary border border-border text-foreground">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Notification History</h3>
                  <p className="text-[11px] text-muted-foreground">Last 10 Days Audit Log</p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Immutability Banner */}
            <div className="mx-4 mt-3 p-2.5 rounded-lg bg-secondary/60 border border-border flex items-center gap-2.5 text-xs text-muted-foreground">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-[11px] leading-tight">
                <strong className="text-foreground">Immutable Log:</strong> Notifications are permanently stored for 10 days and cannot be edited or deleted by anyone.
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 px-4 pt-3 pb-1 border-b border-border/60">
              <button
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  filter === "all"
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                All ({history.length})
              </button>
              <button
                onClick={() => setFilter("success")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  filter === "success"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                Success
              </button>
              <button
                onClick={() => setFilter("error")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  filter === "error"
                    ? "bg-rose-600 text-white font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                Errors
              </button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
                  <Clock className="w-6 h-6 mb-2 opacity-40" />
                  <span>No notifications in the last 10 days.</span>
                </div>
              ) : (
                filteredHistory.map((item) => {
                  const isSuccess = item.type === "success";
                  const isError = item.type === "error";

                  let formattedDate = "";
                  try {
                    formattedDate = formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    });
                  } catch {
                    formattedDate = "recently";
                  }

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSuccess
                                ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                                : isError
                                ? "bg-rose-500 shadow-xs shadow-rose-500/50"
                                : "bg-sky-500"
                            }`}
                          />
                          <h4 className="text-xs font-semibold text-foreground">
                            {item.title}
                          </h4>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                          {formattedDate}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">
                        {item.message}
                      </p>

                      {item.action && (
                        <div className="pl-4 pt-0.5">
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                            {item.action}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-border text-center text-[10px] text-muted-foreground">
              Audit records are automatically retained for 10 days.
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

/**
 * Notification Bell SVG Button with Unread Badge
 */
export function AdminNotificationBell() {
  const { openDrawer, unreadCount } = useAdminNotifications();

  return (
    <button
      onClick={openDrawer}
      className="relative p-2 rounded-lg bg-card border border-border hover:bg-secondary text-foreground transition-colors cursor-pointer"
      title="View Notification History (Last 10 Days)"
      aria-label="Notification history"
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white animate-pulse">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
