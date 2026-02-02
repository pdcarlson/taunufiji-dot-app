"use client";

import { useState, useEffect } from "react";
import useDebounce from "@/hooks/useDebounce";
import LibraryFilters from "@/components/dashboard/library/LibraryFilters";
import LibraryFileCard from "@/components/dashboard/library/LibraryFileCard";
import LibrarySkeleton from "@/components/dashboard/library/LibrarySkeleton";
import ScholarshipStats from "@/components/dashboard/library/ScholarshipStats";
import { Upload, Search } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { account } from "@/lib/infrastructure/persistence/appwrite.web";
import { toast } from "react-hot-toast";

const INITIAL_FILTERS = {
  department: "All",
  course_number: "All",
  professor: "",
  semester: "All",
  year: "",
  assessment_type: "All",
  version: "All",
};

export default function LibraryPage() {
  const { user } = useAuth();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const debouncedFilters = useDebounce(filters, 500);

  // Data State
  const [results, setResults] = useState<any[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [totalArchiveCount, setTotalArchiveCount] = useState(0);
  const [myUploadCount, setMyUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // --- 1. LOAD GLOBAL & USER STATS ---
  useEffect(() => {
    const initData = async () => {
      if (!user) return;
      try {
        const { jwt } = await account.createJWT();

        const res = await fetch("/api/library/stats", {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setTotalArchiveCount(data.totalFiles);
          setMyUploadCount(data.userFiles);
        }
      } catch (e) {
        console.error("Initialization Failed", e);
      }
    };
    initData();
  }, [user]);

  // --- 2. PUBLIC SEARCH ---
  useEffect(() => {
    const runSearch = async () => {
      setLoading(true);
      try {
        // Construct filter object for API
        const apiFilters: any = {};
        Object.keys(debouncedFilters).forEach((key) => {
          // @ts-ignore
          const value = debouncedFilters[key];
          if (value && value !== "All") {
            apiFilters[key] = value;
          }
        });

        // Pass year as number if simple string
        if (apiFilters.year && !isNaN(parseInt(apiFilters.year))) {
          apiFilters.year = parseInt(apiFilters.year);
        }

        const { jwt } = await account.createJWT();

        const res = await fetch("/api/library/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ filters: apiFilters }),
        });

        if (!res.ok) throw new Error("Search Failure");

        const data = await res.json();
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
        totalArchives={totalArchiveCount}
        myContributions={myUploadCount}
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
          results.map((doc) => (
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
