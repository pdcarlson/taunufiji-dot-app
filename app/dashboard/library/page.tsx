import { createSessionClient } from "@/lib/presentation/server/appwrite";
import { getContainer } from "@/lib/infrastructure/container";
import { redirect } from "next/navigation";
import LibraryClient from "@/components/features/library/LibraryClient";

export default async function LibraryPage() {
  // 1. Authenticate (Server-Side)
  let user;
  try {
    const { account } = await createSessionClient();
    user = await account.get();
  } catch (error) {
    redirect("/login");
  }

  // 2. Fetch Stats via Container
  const container = getContainer();
  // Fetch global stats & user specifics
  const stats = await container.libraryService.getStats(user.$id);

  return (
    <LibraryClient
      initialTotal={stats.totalFiles}
      initialUserFiles={stats.userFiles}
    />
  );
}
