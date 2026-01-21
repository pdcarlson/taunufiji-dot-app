import Link from "next/link";
import { LogOut } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-4xl">🚫</span>
        </div>

        <h1 className="text-3xl font-bold font-serif text-fiji-gold">
          Access Denied
        </h1>

        <p className="text-stone-400">
          You are logged in, but you do not have the required{" "}
          <strong>Brother</strong> role on our Discord server.
        </p>

        <div className="bg-stone-900 p-4 rounded-lg border border-stone-800 text-sm text-left space-y-2">
          <p className="font-semibold text-white">How to fix this:</p>
          <ul className="list-disc pl-5 text-stone-400 space-y-1">
            <li>Make sure you are in the Discord Server.</li>
            <li>Ask an Omnicron to unlock your role.</li>
            <li>Try logging out and back in.</li>
          </ul>
        </div>

        <div className="pt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
