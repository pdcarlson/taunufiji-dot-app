import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Login | Tau Nu Fiji",
  },
  description: "Secure Login for Brothers",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
