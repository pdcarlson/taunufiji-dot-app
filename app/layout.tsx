import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

import { env } from "@/lib/infrastructure/config/env";

// Font Setup
const bebas = localFont({
  src: "../public/fonts/BebasNeue.otf",
  variable: "--font-bebas",
});

const langdon = localFont({
  src: "../public/fonts/Langdon.otf",
  variable: "--font-langdon",
});

const BASE_URL = env.NEXT_PUBLIC_APP_URL || "https://taunufiji.app";

export const metadata: Metadata = {
  title: {
    template: "%s | Tau Nu Fiji",
    default: "Tau Nu Fiji - Tau Nu Chapter of Phi Gamma Delta",
  },
  description:
    "The official portal for the Tau Nu Chapter of Phi Gamma Delta at Rensselaer Polytechnic Institute. Manage duties, library resources, and chapter scheduling.",
  keywords: ["Fiji", "Tau Nu", "RPI", "Fraternity", "Dashboard"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Tau Nu Fiji",
    title: "Tau Nu Fiji | App",
    description:
      "The official app for the Tau Nu Chapter of Phi Gamma Delta at Rensselaer Polytechnic Institute. Manage duties, library resources, and chapter scheduling.",
    // images: [openGraphImage], // Uncomment if you add an opengraph-image.tsx or .png
  },
  twitter: {
    card: "summary_large_image",
    title: "Tau Nu Fiji App",
    description: "Tau Nu Chapter Portal",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // NO server-side session validation here.
  // Appwrite cookies are set by appwrite.taunufiji.app and cannot be read
  // by localhost during local dev due to cross-domain cookie restrictions.
  // Auth is handled entirely by the client-side AuthProvider.
  return (
    <html lang="en">
      <body
        className={`${bebas.variable} ${langdon.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <Toaster position="bottom-center" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
