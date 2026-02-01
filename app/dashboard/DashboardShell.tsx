"use client";

import { AuthService } from "@/lib/application/services/auth.service";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  Home,
  ListTodo,
  GraduationCap,
  LogOut,
  LucideIcon,
} from "lucide-react"; // Icons
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading, error, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Detect if we're on the upload page (needs full screen width)
  const isUploadPage = pathname?.includes("/library/upload");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (profile && profile.isAuthorized === false) {
        router.push("/unauthorized");
      }
    }
  }, [user, profile, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fiji-gold"></div>
      </div>
    );
  }

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
