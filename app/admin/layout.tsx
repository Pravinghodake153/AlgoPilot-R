import React from "react";
import { AdminNotificationProvider } from "@/features/admin/components/admin-notification-system";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminNotificationProvider>
      {children}
    </AdminNotificationProvider>
  );
}
