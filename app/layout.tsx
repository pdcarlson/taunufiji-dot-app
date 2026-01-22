import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google"; // Removed Google Fonts
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
