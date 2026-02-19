import LibraryClient from "@/components/features/library/LibraryClient";
import {
  fetchInitialLibraryResources,
  fetchInitialLibraryTotal,
} from "@/lib/presentation/queries/library.queries";

export default async function LibraryPage() {
  const [resources, totalCount] = await Promise.all([
    fetchInitialLibraryResources(),
    fetchInitialLibraryTotal(),
  ]);

  return (
    <LibraryClient
      initialResources={resources}
      initialTotal={totalCount}
      initialUserFiles={0} // Will need to fetch this on client if auth'd
    />
  );
}
