import { Metadata } from "next";
import DashboardShell from "@/components/layout/DashboardShell";

export const metadata: Metadata = {
  title: {
    absolute: "Home | Tau Nu Fiji",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ⚠️ Client-Side Auth Strategy
  // We strictly avoid server-side cookie reading.
  // The DashboardShell will handle auth via Client SDK & JWTs.
  return (
    <DashboardShell initialUser={null}>
      {children}
    </DashboardShell>
  );
}
