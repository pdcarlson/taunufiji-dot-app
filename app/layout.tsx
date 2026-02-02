import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "react-hot-toast";
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
