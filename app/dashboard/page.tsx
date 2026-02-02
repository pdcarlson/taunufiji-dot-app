import { createSessionClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import DashboardWidgets from "@/components/dashboard/DashboardWidgets";

export default async function DashboardHome() {
  try {
    // 1. Auth & Session (Fast - specific to User Identity)
    let user;
    try {
      const { account } = await createSessionClient();
      user = await account.get();
    } catch (error) {
      redirect("/login");
    }

    // Resolve basic profile info for Greeting (Fast Query)
    const container = getContainer();
    const profile = await container.authService.getProfile(user.$id);

    if (!profile) {
      return (
        <div className="p-8 text-center">
          <h1 className="text-xl font-bold text-red-500">Profile Error</h1>
          <p className="text-stone-400">Could not resolve user profile.</p>
        </div>
      );
    }

    // 2. Greeting Logic
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? "Good Morning"
        : hour < 18
          ? "Good Afternoon"
          : "Good Evening";

    const getLastName = (nameProp: string) => {
      if (!nameProp || nameProp === "Brother") return "";
      const clean = nameProp.trim();
      if (clean.includes(" ")) {
        const parts = clean.split(" ");
        return parts[parts.length - 1];
      }
      if (clean.includes(".")) {
        const parts = clean.split(".");
        const last = parts[parts.length - 1];
        return last.charAt(0).toUpperCase() + last.slice(1);
      }
      return clean;
    };

    // User's name might be in profile or fallback to account name if needed,
    // but stats has fullName. We can use profile name here for speed.
    // Or just "Brother" temporarily if we want to avoid another fetch.
    // Actually profile.discord_username or similar is available.
    // Let's use "Brother" + Last Name if we have it, else just "Brother".
    // We already fetched profile.

    // NOTE: DashboardWidgets will fetch the detailed stats including full name.
    // We can pass the name down or just render greeting here.
    // For instant load, let's use what we have potentially or just standard greeting.
    // But we want "Good Morning, Brother [Name]".
    // Profile has `name`? Check user entity.
    // user.name from Appwrite account is usually available immediately.

    const lastName = getLastName(user.name || "Brother");
    const displayName = lastName ? `Brother ${lastName}` : "Brother";

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* HERO SECTION (Instant Render) */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden border border-white/5">
          {/* Background Texture */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-fiji-purple opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10">
            <h1 className="font-bebas text-5xl mb-2 tracking-wide">
              {greeting}, {displayName}.
            </h1>
            <div className="max-w-2xl">
              <p className="text-stone-400 font-serif italic text-lg leading-relaxed border-l-4 border-fiji-purple pl-4 my-6">
                &quot;Nothing in the world can take the place of persistence.
                Talent will not... Genius will not... Education will not...
                Persistence and determination alone are omnipotent.&quot;
              </p>
              <p className="text-sm text-stone-500 font-bold uppercase tracking-widest">
                — Calvin Coolidge (Amherst College, 1895)
              </p>
            </div>
          </div>
        </div>

        {/* WIDGETS (Streaming) */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardWidgets userId={user.$id} discordId={profile.discord_id} />
        </Suspense>
      </div>
    );
  } catch (criticalError) {
    if (
      criticalError instanceof Error &&
      criticalError.message === "NEXT_REDIRECT"
    ) {
      throw criticalError;
    }

    console.error("Critical Dashboard Crash:", criticalError);
    return (
      <div className="p-12 text-center">
        <h1 className="text-2xl font-bold text-stone-300 mb-2">
          Something went wrong.
        </h1>
        <p className="text-stone-500">Please try refreshing the page.</p>
      </div>
    );
  }
}
