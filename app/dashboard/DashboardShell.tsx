"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  ListTodo,
  GraduationCap,
  LogOut,
  LucideIcon,
  Loader2,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardShell({
  children,
  initialUser,
  initialProfile,
}: {
  children: React.ReactNode;
  initialUser?: any;
  initialProfile?: any;
}) {
  const { user, profile, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // 1. Hybrid Auth Resolution
  const effectiveUser = initialUser || user;

  // 2. Client-Side Fallback Trigger
  // If server failed (no initialUser) and client hasn't loaded yet,
  // the AuthProvider's internal useEffect will run 'checkSession'.
  // We just need to make sure we don't redirect until we are SURE.

  // 3. Protection: Redirect ONLY if fully loaded and no user found via either method
  if (!loading && !effectiveUser) {
    router.push("/login");
    return null;
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-fiji-purple" />
      </div>
    );
  }

  // Detect if we're on the upload page (needs full screen width)
  const isUploadPage = pathname?.includes("/library/upload");

  // Mobile-First Shell
  return (
    <div className="min-h-screen bg-stone-50 pb-20 md:pb-0 md:pl-64">
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <Sidebar />

      {/* Main Content */}
      <main
        className={
          isUploadPage
            ? "h-screen p-6" // Full screen with 24px margins for upload page
            : "p-4 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-300" // Constrained for other pages
        }
      >
        {children}
      </main>

      {/* Mobile Bottom Nav (Visible on Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-950 border-t border-stone-800 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          <MobileNavLink href="/dashboard" icon={Home} label="Home" />
          <MobileNavLink
            href="/dashboard/housing"
            icon={ListTodo}
            label="Tasks"
          />
          <MobileNavLink
            href="/dashboard/library"
            icon={GraduationCap}
            label="Library"
          />
        </div>
      </nav>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function MobileNavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center w-full h-full text-stone-500 hover:text-white transition-colors"
    >
      <Icon className="w-6 h-6" />
      <span className="text-[10px] uppercase font-bold mt-1 tracking-wider">
        {label}
      </span>
    </Link>
  );
}
