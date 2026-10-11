import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { WellnessProvider } from "@/context/WellnessContext";
import { AppShell } from "@/components/layout/AppShell";
import { BreakModal } from "@/components/break/BreakModal";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ergo TMS — Workplace Well-being",
  description: "Desk stretch protocols, guided breathing and energy management for focused professionals.",
};

export const viewport: Viewport = { themeColor: "#f4f7f4", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WellnessProvider>
          <AppShell>{children}</AppShell>
          <BreakModal />
        </WellnessProvider>
      </body>
    </html>
  );
}
