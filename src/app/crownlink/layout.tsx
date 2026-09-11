import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Bloodline Arena | Royals Bloodline",
    template: "%s | Bloodline Arena",
  },
  description:
    "Bloodline Arena by Royals Bloodline: creator battles, events, matchmaking, schedules, and support.",
  openGraph: {
    title: "Bloodline Arena | Royals Bloodline",
    description:
      "Your home for creator battles, events, matchmaking, schedules, and support.",
    siteName: "Bloodline Arena",
  },
  twitter: {
    card: "summary",
    title: "Bloodline Arena | Royals Bloodline",
    description:
      "Your home for creator battles, events, matchmaking, schedules, and support.",
  },
};

export default function ArenaLayout({ children }: { children: ReactNode }) {
  return children;
}
