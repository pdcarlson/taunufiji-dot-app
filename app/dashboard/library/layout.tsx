import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scholarship Library | Tau Nu Fiji",
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
