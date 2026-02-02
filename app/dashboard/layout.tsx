import { Metadata } from "next";
import DashboardShell from "./DashboardShell";
import { createSessionClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Home | Tau Nu Fiji",
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
    <DashboardShell initialUser={null} initialProfile={null}>
      {children}
    </DashboardShell>
  );
}
