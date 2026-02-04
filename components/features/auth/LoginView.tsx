"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Shield, Lock } from "lucide-react";

export default function LoginView() {
  const { login } = useAuth();

  return (
    <main className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] pointer-events-none" />

      {/* Card */}
      <div className="bg-stone-800 border border-stone-700 p-8 md:p-12 rounded-2xl shadow-2xl max-w-md w-full relative z-10 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-fiji-purple/20 text-fiji-purple rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-fiji-purple/50">
          <Shield className="w-10 h-10" />
        </div>

        {/* Text */}
        <h1 className="font-bebas text-4xl text-white mb-2 tracking-wide">
          Tau Nu Fiji App
        </h1>
        <p className="text-stone-400 mb-8 font-sans">
          Restricted Access. Brothers Only.
        </p>

        {/* Login Button */}
        <button
          onClick={login}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg group"
        >
          <svg
            className="w-6 h-6 fill-current"
            viewBox="0 0 127 96"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22c.63-23.28-18.68-47.5-38.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
          </svg>
          <span>Login with Discord</span>
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-stone-500 uppercase tracking-widest">
          <Lock className="w-3 h-3" />
          <span>Secure Connection</span>
        </div>
      </div>
    </main>
  );
}
