import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

import { env } from "@/lib/infrastructure/config/env";
import { APP_NAME, APP_DESCRIPTION, BASE_URL } from "@/lib/constants";

// Font Setup
const bebas = localFont({
  src: "../public/fonts/BebasNeue.otf",
  variable: "--font-bebas",
});

const langdon = localFont({
  src: "../public/fonts/Langdon.otf",
  variable: "--font-langdon",
});

const ENV_PREFIX = env.NODE_ENV === "production" ? "" : `[${env.NODE_ENV.toUpperCase()}] `;

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: `${ENV_PREFIX}${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["Fiji", "Tau Nu", "RPI", "Fraternity", "Dashboard"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: APP_NAME,
    title: `${ENV_PREFIX}${APP_NAME}`,
    description: APP_DESCRIPTION,
    // images: [openGraphImage], // Uncomment if you add an opengraph-image.tsx or .png
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
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
