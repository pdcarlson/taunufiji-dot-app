"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Home,
  ListTodo,
  GraduationCap,
  User,
  LogOut,
  Globe,
} from "lucide-react";

// Nav Items Definition
const NAV_ITEMS = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Tasks", href: "/dashboard/housing", icon: ListTodo },
  { name: "Library", href: "/dashboard/library", icon: GraduationCap },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth(); // TODO: Add isWebmaster check if available

  // Mock isWebmaster until fully implemented in AuthContext or use Role Check
  // Assuming 'webmaster' or 'dev' role in user.roles (if synced) or position_key (deleted).
  // We synced roles to DB? Auth service syncs handle/name.
  // We check roles live.
  // For UI, we need to know if we should show Webmaster links.
  // Let's assume false or check user.position (if we kept it? No we deleted it).
  // We need to expose roles in useAuth/User object.
  // For now, let's just render standard links or check a "roles" array if we add it to Session/User.
  const isWebmaster = false;

  return (
    <aside className="hidden md:flex w-64 flex-col bg-stone-900 text-white h-screen fixed left-0 top-0 border-r border-white/10 z-50 font-sans">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="font-langdon text-2xl tracking-widest text-fiji-gold">
          TAU NU FIJI
        </div>
        <div className="text-xs text-stone-400 uppercase tracking-wider mt-1">
          Active Session
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-grow p-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all group ${
                isActive
                  ? "bg-fiji-purple text-white shadow-lg shadow-purple-900/20"
                  : "text-stone-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${
                  isActive
                    ? "text-white"
                    : "text-stone-500 group-hover:text-fiji-gold"
                }`}
              />
              <span className="font-bebas tracking-wide text-lg">
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* WEBMASTER LINKS (Placeholder for now) */}
        {isWebmaster && (
          <>
            <div className="px-4 mt-6 mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                Webmaster Hub
              </span>
            </div>

            <Link
              href="/dashboard/webmaster/site"
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all group ${
                pathname === "/dashboard/webmaster/site"
                  ? "bg-fiji-purple text-white shadow-lg shadow-purple-900/20"
                  : "text-stone-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Globe className="w-5 h-5 text-stone-500 group-hover:text-fiji-gold" />
              <span className="font-bebas tracking-wide text-lg">
                Site Content
              </span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-4 py-3 text-stone-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-bebas tracking-wide text-lg">Log Out</span>
        </button>
      </div>
    </aside>
  );
}
