import Link from "next/link";
import { LogOut, ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-red-100 rounded-3xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-12 h-12 text-red-600" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="font-bebas text-6xl text-stone-900 tracking-tighter">
            Access Restricted
          </h1>
          <p className="text-stone-500 text-lg">
            You are logged in, but you lack the required authentication
            clearance.
          </p>
        </div>

        {/* Instructions Card */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm text-left space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-fiji-gold animate-pulse" />
            <p className="font-bold text-stone-800 text-sm uppercase tracking-wider">
              Verification Required
            </p>
          </div>
          <ul className="list-disc pl-5 text-stone-600 text-sm space-y-2 marker:text-stone-400">
            <li>Ensure you are a member of the Discord Server.</li>
            <li>Verify you have the "Brothers" role.</li>
            <li>
              Contact an <strong>Officer</strong> for manual approval.
            </li>
          </ul>
        </div>

        {/* Action */}
        <div className="pt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-stone-900 text-white px-8 py-4 rounded-xl font-bold transition-all hover:bg-stone-800 hover:-translate-y-1 shadow-lg hover:shadow-xl"
          >
            <LogOut className="w-5 h-5" />
            Return to Login
          </Link>
        </div>

        <div className="pt-8 text-xs font-bold text-stone-300 uppercase tracking-widest">
          Tau Nu Chapter • Security Division
        </div>
      </div>
    </div>
  );
}
