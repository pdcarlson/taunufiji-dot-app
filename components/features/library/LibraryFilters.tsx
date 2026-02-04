"use client";

import { useEffect, useState } from "react";
import { ASSESSMENT_TYPES, VERSIONS, SEMESTERS } from "@/lib/utils/courseData";
import { Search, Filter, Loader2 } from "lucide-react";
import { account } from "@/lib/infrastructure/persistence/appwrite.web";
import toast from "react-hot-toast";
import { getMetadataAction } from "@/lib/presentation/actions/library/read.actions";

interface FilterProps {
  filters: any;
  setFilters: (f: any) => void;
}

export default function LibraryFilters({ filters, setFilters }: FilterProps) {
  const [loading, setLoading] = useState(true);

  // Dynamic Data State
  const [courseData, setCourseData] = useState<
    Record<string, { number: string; name: string }[]>
  >({});
  const [professors, setProfessors] = useState<string[]>([]);

  // Load Data on Mount
  useEffect(() => {
    const load = async () => {
      try {
        // We can pass undefined JWT if purely public, or create one if strict auth needed.
        // getMetadataAction handles it.
        const { jwt } = await account.createJWT();
        const data = await getMetadataAction(jwt);

        if (data) {
          setCourseData(data.courses);
          setProfessors(data.professors);
        }
      } catch (e) {
        console.error("Failed to load filter data", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derived Options
  const deptOptions = Object.keys(courseData).sort();
  const availableCourses =
    filters.department && filters.department !== "All"
      ? courseData[filters.department] || []
      : [];

  const handleChange = (key: string, val: string) => {
    setFilters({ ...filters, [key]: val });
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex items-center justify-center h-24">
        <Loader2 className="w-6 h-6 animate-spin text-fiji-purple" />
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
      <div className="flex items-center gap-2 mb-2 text-stone-400 text-xs font-bold uppercase tracking-wider">
        <Filter className="w-4 h-4" /> Filter Archives
      </div>

      {/* MOBILE OPTIMIZED GRID: 1 col on phone, 2 on small tablet, 4 on tablet, 7 on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* DEPARTMENT */}
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
            Dept
          </label>
          <select
            className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50 h-10"
            value={filters.department}
            onChange={(e) => handleChange("department", e.target.value)}
          >
            <option value="All">All Depts</option>
            {deptOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* COURSE NUMBER */}
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
            Course
          </label>
          <select
            className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50 h-10 disabled:opacity-50"
            value={filters.course_number}
            onChange={(e) => handleChange("course_number", e.target.value)}
            disabled={filters.department === "All"}
          >
            <option value="All">All Numbers</option>
            {availableCourses.map((c) => (
              <option key={c.number} value={c.number}>
                {c.number}
              </option>
            ))}
          </select>
        </div>

        {/* PROFESSOR (Spans 2 cols on tablet+) */}
        <div className="col-span-1 sm:col-span-2 md:col-span-2">
          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
            Professor
          </label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search Name..."
              list="professors-list"
              className="w-full pl-8 pr-2 h-10 border border-stone-200 rounded text-sm bg-stone-50"
              value={filters.professor}
              onChange={(e) => handleChange("professor", e.target.value)}
            />
            <datalist id="professors-list">
              {professors.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>

        {/* SEMESTER */}
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
            Semester
          </label>
          <select
            className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50 h-10"
            value={filters.semester}
            onChange={(e) => handleChange("semester", e.target.value)}
          >
            <option value="All">All</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* YEAR */}
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
            Year
          </label>
          <input
            type="number"
            placeholder="YYYY"
            className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50 h-10"
            value={filters.year}
            onChange={(e) => handleChange("year", e.target.value)}
          />
        </div>

        {/* TYPE */}
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
            Type
          </label>
          <select
            className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50 h-10"
            value={filters.assessment_type}
            onChange={(e) => handleChange("assessment_type", e.target.value)}
          >
            <option value="All">All Types</option>
            {ASSESSMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
