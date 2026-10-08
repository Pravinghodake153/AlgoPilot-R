"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  Database,
  Users,
  MessageSquare,
  Layers,
  ShieldAlert,
  Briefcase,
  Sparkles,
  PanelLeft,
  ArrowLeft,
} from "lucide-react";
import { AdminNotificationBell } from "./admin-notification-system";
import { SettingsModal } from "./settings-modal";

export function Sidebar() {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  const links = [
    { name: "Users", href: "/admin", icon: Users },
    { name: "Interview Roles", href: "/admin/roles", icon: Briefcase },
    { name: "Skills Manager", href: "/admin/skills", icon: Sparkles },
    { name: "Interview & Category Studio", href: "/admin/voice-studio", icon: Layers },
    { name: "Database Logs", href: "/admin/database", icon: Database },
    { name: "User Feedbacks", href: "/admin/feedback", icon: MessageSquare },
    { name: "Cheaters", href: "/admin/cheaters", icon: ShieldAlert },
  ];

  return (
    <>
      <div
        className={`${
          isCollapsed ? "w-16" : "w-64"
        } border-r border-border bg-card flex flex-col h-full shrink-0 transition-[width] duration-300 ease-in-out`}
      >
        {/* Header */}
        {isCollapsed ? (
          <div className="p-3 border-b border-border flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-2 rounded-lg bg-card border border-border hover:bg-secondary text-foreground transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <AdminNotificationBell />
          </div>
        ) : (
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="text-base font-bold tracking-tight text-foreground hover:opacity-80 truncate"
            >
              AlgoPilot<span className="text-primary">.Admin</span>
            </Link>
            <div className="flex items-center gap-1.5 shrink-0">
              <AdminNotificationBell />
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-2 rounded-lg bg-card border border-border hover:bg-secondary text-foreground transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={`flex-1 ${isCollapsed ? "p-2 space-y-2" : "p-4 space-y-1.5"} overflow-y-auto`}>
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center ${
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
                } rounded-lg text-xs transition-colors relative group ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
                }`}
                title={isCollapsed ? link.name : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{link.name}</span>}

                {/* Floating tooltip when collapsed */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1 bg-popover text-popover-foreground text-[11px] font-medium rounded-md shadow-md border border-border whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {link.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {isCollapsed ? (
          <div className="p-2 border-t border-border flex flex-col items-center gap-2 bg-card">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors relative group"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-popover text-popover-foreground text-[11px] font-medium rounded-md shadow-md border border-border whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Dashboard
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative group"
              title="Open System & AI Settings"
              aria-label="Open settings"
            >
              <Settings className="w-4 h-4 hover:rotate-45 transition-transform duration-300 shrink-0" />
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-popover text-popover-foreground text-[11px] font-medium rounded-md shadow-md border border-border whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Settings
              </div>
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-border flex items-center justify-between gap-2 bg-card">
            <Link
              href="/dashboard"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Dashboard</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="group flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-secondary hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              title="Open System & AI Settings"
              aria-label="Open settings"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:rotate-45 transition-transform duration-300 shrink-0" />
              <span className="font-medium">Settings</span>
            </button>
          </div>
        )}
      </div>

      {/* 80% screen Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
