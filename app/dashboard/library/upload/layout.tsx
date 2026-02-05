"use client";

import { UploadQueueProvider } from "@/components/features/library/upload/UploadContext";

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UploadQueueProvider>{children}</UploadQueueProvider>;
}
