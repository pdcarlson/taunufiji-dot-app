import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "react-hot-toast";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/presentation/server/appwrite";
import { COOKIE_SESSION_NAME } from "@/lib/constants";
import "./globals.css";

// Font Setup
const bebas = localFont({
  src: "../public/fonts/BebasNeue.otf",
  variable: "--font-bebas",
});

const langdon = localFont({
  src: "../public/fonts/Langdon.otf",
  variable: "--font-langdon",
});

export const metadata: Metadata = {
  title: "Tau Nu Fiji | App",
  description: "Tau Nu Fiji Chapter App",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. Server-Side Session Validation
  let user = null;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_SESSION_NAME);

  if (sessionCookie) {
    try {
      // If cookie exists, verify it with Appwrite
      const { account } = await createSessionClient();
      user = await account.get();
    } catch (error) {
      // 2. Cookie exists but is invalid (Stale) -> CLEANUP
      // We must break the loop by deleting the cookie.
      // Layout cannot delete cookies directly, so we redirect to a cleanup handler.
      console.error(
        "[RootLayout] Stale session detected, cleaning up...",
        error,
      );
      redirect("/api/auth/cleanup");
    }
  }

  return (
    <html lang="en">
      <body
        className={`${bebas.variable} ${langdon.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {/* 3. Pass Hydrated State to Client */}
        <AuthProvider initialUser={user}>
          <Toaster position="bottom-center" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
