"use client";

import { UploadQueueProvider } from "@/components/library/upload/UploadContext";

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UploadQueueProvider>{children}</UploadQueueProvider>;
}
