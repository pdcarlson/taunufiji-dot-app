"use client";

import { useState } from "react";
import { Download, FileText, AlertCircle, ShieldCheck, GraduationCap, Calendar, User } from "lucide-react";
import { account } from "@/lib/infrastructure/client/appwrite";

export default function LibraryFileCard({ file }: { file: any }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      const { jwt } = await account.createJWT();
      const res = await fetch(`/api/library/download?id=${file.$id}`, {
        headers: {
            'Authorization': `Bearer ${jwt}`
        }
      });
      if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || "Failed to authorize download");
      }
      
      const { url } = await res.json();

      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Download failed");
    } finally {
      setLoading(false);
    }
  };

  const isKey = file.version !== "Student";

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-fiji-purple transition-all duration-300 overflow-hidden group">
      <div className="flex flex-col md:flex-row md:items-center p-4 gap-4 md:gap-6">
        
        {/* LEFT: Course Badge */}
        <div className="flex items-center gap-4 md:block md:w-24 md:text-center md:shrink-0">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                isKey ? "bg-fiji-purple text-white" : "bg-stone-100 text-stone-500"
            }`}>
               <FileText className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="md:hidden">
                <h3 className="font-bebas text-xl text-stone-800 leading-none">
                    {file.department} {file.course_number}
                </h3>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                    {file.semester} {file.year}
                </p>
            </div>
        </div>

        {/* CENTER: Main Details */}
        <div className="flex-1 min-w-0 md:border-l md:border-stone-100 md:pl-6">
            <div className="hidden md:flex items-center gap-2 mb-1">
                <span className="font-black text-stone-500 text-xs uppercase tracking-widest">
                    {file.department} {file.course_number}
                </span>
                <span className="w-1 h-1 bg-stone-400 rounded-full" />
                <span className="font-bold text-stone-600 text-xs uppercase tracking-wider">
                    {file.semester} {file.year}
                </span>
            </div>
            
            <h4 className="font-bebas text-xl md:text-2xl text-stone-900 truncate group-hover:text-fiji-purple transition-colors">
                {file.type || "Unknown Resource"}
            </h4>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-stone-600">
                <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1 rounded-md border border-stone-200">
                    <User className="w-3.5 h-3.5 text-stone-500" />
                    <span className="font-bold text-stone-700 truncate max-w-[120px]">
                        {file.professor || "Unknown Prof"}
                    </span>
                </div>
                
                {/* Mobile Version Badge (Inline) */}
                 <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold uppercase tracking-wide md:hidden ${
                    isKey 
                        ? "bg-purple-50 text-fiji-purple border-purple-100" 
                        : "bg-yellow-50 text-yellow-700 border-yellow-100"
                }`}>
                    {isKey ? <ShieldCheck className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                    {isKey ? "Answer Key" : "Student Copy"}
                </div>
            </div>
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center justify-between md:flex-col md:items-end md:gap-3 mt-2 md:mt-0 border-t md:border-t-0 pt-4 md:pt-0 border-stone-100">
            {/* Desktop Version Badge */}
            <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                isKey 
                    ? "bg-purple-50 text-fiji-purple ring-1 ring-purple-100" 
                    : "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100"
            }`}>
                {isKey ? <ShieldCheck className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                {isKey ? "Answer Key" : "Student Copy"}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
                {error && (
                    <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Error
                    </span>
                )}
                
                <button
                    onClick={handleDownload}
                    disabled={loading}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-stone-900 hover:bg-fiji-purple text-white px-5 py-2.5 rounded-lg font-bebas text-lg tracking-wide transition-all shadow-sm hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="animate-pulse text-sm font-sans font-bold uppercase">Downloading...</span>
                    ) : (
                        <>
                            <Download className="w-4 h-4" /> Download
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
