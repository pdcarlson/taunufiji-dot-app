import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Housing Tasks | Tau Nu Fiji",
};

export default function HousingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
