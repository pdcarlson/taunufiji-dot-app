import LibraryClient from "@/components/library/LibraryClient";
import {
  fetchInitialLibraryResources,
  fetchInitialLibraryTotal,
  fetchLibraryGlobalStats,
} from "@/lib/presentation/queries/library.queries";

export default async function LibraryPage() {
  const [resources, totalCount, stats] = await Promise.all([
    fetchInitialLibraryResources(),
    fetchInitialLibraryTotal(),
    fetchLibraryGlobalStats(),
  ]);

  return (
    <LibraryClient
      initialResources={resources}
      initialTotal={totalCount}
      initialUserFiles={0} // Will need to fetch this on client if auth'd
    />
  );
}
