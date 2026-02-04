"use client";

import { useAuth } from "@/components/providers/AuthProvider";

interface GreetingCardProps {
  userName?: string;
}

/**
 * Time-based greeting card with Calvin Coolidge quote.
 * Displays "Good Morning/Afternoon/Evening, Brother [LastName]."
 */
export default function GreetingCard({ userName }: GreetingCardProps) {
  const { user } = useAuth();
  const name = userName || user?.name || "Brother";

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  // Smart last name extractor: handles "Brother Lastname" format
  const getDisplayName = (fullName: string): string => {
    if (!fullName) return "Brother";
    // Remove "Brother " prefix if present
    const cleanName = fullName.replace(/^Brother\s+/i, "").trim();
    // Get last word (assumed to be last name)
    const parts = cleanName.split(" ");
    const lastName = parts.length > 1 ? parts[parts.length - 1] : cleanName;
    return `Brother ${lastName}`;
  };

  const displayName = getDisplayName(name);

  return (
    <div className="bg-stone-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-fiji-purple opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Content */}
      <div className="relative z-10">
        {/* Greeting */}
        <h1 className="font-bebas text-4xl md:text-5xl text-fiji-gold tracking-wide mb-6">
          {greeting}, {displayName}.
        </h1>

        {/* Quote */}
        <div className="border-l-4 border-fiji-purple pl-4">
          <p className="text-stone-400 font-serif italic text-lg leading-relaxed">
            &quot;Nothing in the world can take the place of persistence. Talent
            will not... Genius will not... Education will not... Persistence and
            determination alone are omnipotent.&quot;
          </p>
          <p className="text-sm text-stone-500 font-bold uppercase tracking-widest mt-4">
            — Calvin Coolidge (Amherst College, 1895)
          </p>
        </div>
      </div>
    </div>
  );
}
