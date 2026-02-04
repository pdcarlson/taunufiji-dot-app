import "server-only";

import { getContainer } from "@/lib/infrastructure/container";

// SERVICE accessed via container in functions

/**
 * Fetch Initial Library Resources (Server Side)
 * Fetches default view (e.g. recent uploads or empty filter)
 */
export async function fetchInitialLibraryResources() {
  try {
    const { libraryService } = getContainer();
    const result = await libraryService.search({});
    // Serialize
    return JSON.parse(JSON.stringify(result.documents));
  } catch (error) {
    console.error("Failed to prefetch library resources:", error);
    return [];
  }
}

/**
 * Fetch Library Global Stats (Server Side)
 * Fetches total count of files
 */
export async function fetchLibraryGlobalStats() {
  try {
    const { libraryService } = getContainer();
    const stats = await libraryService.getStats();
    return {
      total: stats.totalFiles,
      userFiles: 0, // Cannot fetch user files server-side without session
    };
  } catch (error) {
    console.error("Failed to prefetch library stats:", error);
    return { total: 0, userFiles: 0 };
  }
}

/**
 * Fetch Initial Search Total
 */
export async function fetchInitialLibraryTotal() {
  try {
    const { libraryService } = getContainer();
    const result = await libraryService.search({});
    return result.total;
  } catch (error) {
    return 0;
  }
}
