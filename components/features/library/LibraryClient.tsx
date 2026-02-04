"use client";

import { useState, useEffect } from "react";
import useDebounce from "@/hooks/useDebounce";
import LibraryFilters from "./LibraryFilters";
import LibraryFileCard from "./LibraryFileCard";
import LibrarySkeleton from "./LibrarySkeleton";
import ScholarshipStats from "./ScholarshipStats";
import { Upload, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  searchLibraryAction,
  getLibraryStatsAction,
} from "@/lib/presentation/actions/library/read.actions";
import { useAuth } from "@/components/providers/AuthProvider";

// We'll reuse the existing search API for infinite scroll/filtering interactions
// since moving ALL search logic to server actions might be overkill for simple filtering
// unless we want to use generic Search Actions.
// For now, keeping the API fetch for dynamic search is fine, but we accept initial data.

interface LibraryClientProps {
  initialTotal: number;
  initialUserFiles: number;
  initialResources?: any[];
}

const INITIAL_FILTERS = {
  department: "All",
  course_number: "All",
  professor: "",
  semester: "All",
  year: "",
  assessment_type: "All",
  version: "All",
};

export default function LibraryClient({
  initialTotal,
  initialUserFiles,
  initialResources = [],
}: LibraryClientProps) {
  const { getToken, user } = useAuth();
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const debouncedFilters = useDebounce(filters, 500);

  // Stats State
  const [stats, setStats] = useState({
    total: initialTotal,
    userFiles: initialUserFiles,
  });

  // Only fetch user-specific stats if we have a user
  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!user) return; // public view already has total
        const jwt = await getToken();
        const data = await getLibraryStatsAction(jwt);
        // Only update if we need to (or just update userFiles)
        setStats({ total: data.totalFiles, userFiles: data.userFiles });
      } catch (e) {
        console.error("Stats fetch failed", e);
      }
    };
    fetchStats();
  }, [user]);

  // Data State
  const [results, setResults] = useState<any[] | null>(initialResources);
  const [searchTotal, setSearchTotal] = useState(initialTotal);
  // If we have initial resources, we aren't loading initially
  const [loading, setLoading] = useState(initialResources.length === 0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    // Skip the very first run if we have initial data AND filters haven't changed
    // But debouncedFilters changes on mount? No, it initializes with value.
    // We want to skip search if filters are default AND we have initial data.

    const isDefaultFilters = Object.keys(INITIAL_FILTERS).every(
      (k) =>
        // @ts-ignore
        filters[k] === INITIAL_FILTERS[k],
    );

    if (isFirstLoad && initialResources.length > 0 && isDefaultFilters) {
      setIsFirstLoad(false);
      return;
    }

    const runSearch = async () => {
      setLoading(true);
      try {
        const apiFilters: any = {};
        Object.keys(debouncedFilters).forEach((key) => {
          // @ts-ignore
          const value = debouncedFilters[key];
          if (value && value !== "All") {
            apiFilters[key] = value;
          }
        });

        if (apiFilters.year && !isNaN(parseInt(apiFilters.year))) {
          apiFilters.year = parseInt(apiFilters.year);
        }

        const jwt = await getToken();
        // Server Action Call
        const data = await searchLibraryAction(apiFilters, jwt);

        setResults(data.documents);
        setSearchTotal(data.total);
      } catch (err) {
        console.error("Search failed:", err);
        toast.error("Failed to load library");
      } finally {
        setLoading(false);
      }
    };

    runSearch();
    setIsFirstLoad(false);
  }, [debouncedFilters]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-center md:text-left">
        <div>
          <h1 className="font-bebas text-3xl md:text-4xl text-fiji-dark leading-none">
            Scholarship Library
          </h1>
          <p className="text-stone-500 text-xs md:text-sm">
            {loading ? "Searching..." : `${searchTotal} files found`}
          </p>
        </div>
        <Link
          href="/dashboard/library/upload"
          className="bg-fiji-purple hover:bg-fiji-dark text-white px-6 py-3 rounded-lg font-bebas tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all w-full md:w-auto"
        >
          <Upload className="w-5 h-5" /> Upload Exam
        </Link>
      </div>

      {/* Stats Bar */}
      <ScholarshipStats
        totalArchives={stats.total}
        myContributions={stats.userFiles}
        pendingReviews={0}
      />

      {/* Filters & Results */}
      <div className="space-y-4">
        <LibraryFilters filters={filters} setFilters={setFilters} />

        {loading && (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <LibrarySkeleton key={i} />
            ))}
          </div>
        )}

        {!loading && results && results.length === 0 && (
          <div className="bg-stone-100 rounded-lg p-12 text-center border border-dashed border-stone-300 text-stone-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            No files found matching these filters.
          </div>
        )}

        {!loading &&
          results &&
          results.map((doc: any) => (
            <LibraryFileCard key={doc.$id || doc.id} file={doc} />
          ))}

        {!loading && results && results.length < searchTotal && (
          <div className="text-center py-4 text-xs text-stone-400 font-bold uppercase tracking-widest border-t border-stone-100 mt-4">
            Showing top 50 of {searchTotal} results.
          </div>
        )}
      </div>
    </div>
  );
}
