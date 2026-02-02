"use client";

// Disable prerendering - PDF library uses browser APIs
export const dynamic = "force-dynamic";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic_ from "next/dynamic";
import { useUploadQueue } from "@/components/features/library/upload/UploadContext";
import { useAuth } from "@/components/auth/AuthProvider";
import { account } from "@/lib/infrastructure/persistence/appwrite.web";
import { ASSESSMENT_TYPES, VERSIONS, SEMESTERS } from "@/lib/utils/courseData";
import type { PdfRedactorRef } from "@/components/features/library/upload/PdfRedactor";
import Combobox from "@/components/ui/Combobox";
import {
  UploadCloud,
  Check,
  Loader2,
  FileText,
  Trash2,
  AlertTriangle,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  uploadFileAction,
  createLibraryResourceAction,
  checkDuplicateResourceAction,
} from "@/lib/presentation/actions/library.actions";
import { getMetadataAction } from "@/lib/presentation/actions/library.actions";

// Dynamic import to prevent SSR evaluation of PDF library (uses DOMMatrix)
const PdfRedactor = dynamic_(
  () => import("@/components/features/library/upload/PdfRedactor"),
  { ssr: false },
);

export default function UnifiedUploadPage() {
  const { user } = useAuth();
  const {
    addFilesToQueue,
    removeCurrentFileFromQueue,
    currentFile,
    queueLength,
    stickyMetadata,
    setStickyMetadata,
  } = useUploadQueue();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const redactorRef = useRef<PdfRedactorRef>(null);

  // --- DYNAMIC DATA STATE ---
  const [dataLoading, setDataLoading] = useState(true);
  const [courseData, setCourseData] = useState<
    Record<string, { number: string; name: string }[]>
  >({});
  const [professors, setProfessors] = useState<string[]>([]);

  // Modal State for New Course Name
  const [isNamingCourse, setIsNamingCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [pendingCourseNumber, setPendingCourseNumber] = useState("");

  // --- 1. LOAD METADATA ---
  useEffect(() => {
    const load = async () => {
      try {
        // Use Server Action instead of API Route
        // Generate JWT for stateless auth
        const { jwt } = await account.createJWT();
        const data = await getMetadataAction(jwt);
        if (data) {
          setCourseData(data.courses);
          setProfessors(data.professors);
        }
      } catch (e) {
        console.error("Failed to load metadata", e);
        toast.error("Could not load course data");
      } finally {
        setDataLoading(false);
      }
    };
    load();
  }, []);

  // --- HANDLERS ---

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        const pdfs = Array.from(e.dataTransfer.files).filter(
          (f) => f.type === "application/pdf",
        );
        if (pdfs.length > 0) addFilesToQueue(pdfs);
        else toast.error("Only PDF files are allowed.");
      }
    },
    [addFilesToQueue],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const pdfs = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf",
      );
      if (pdfs.length > 0) addFilesToQueue(pdfs);
    }
  };

  // --- DATA CREATION HANDLERS ---

  const handleCreateDept = async (dept: string) => {
    setCourseData((prev) => ({ ...prev, [dept.toUpperCase()]: [] }));
  };

  const handleCreateCourseNumber = async (num: string) => {
    setPendingCourseNumber(num);
    setNewCourseName("");
    setIsNamingCourse(true);
  };

  const submitNewCourse = async () => {
    if (!newCourseName) return;
    const dept = stickyMetadata.department;
    const num = pendingCourseNumber;

    setIsNamingCourse(false);

    // We update local state immediately.
    // The actual "creation" happens when a file is uploaded with this metadata.
    setCourseData((prev) => ({
      ...prev,
      [dept]: [...(prev[dept] || []), { number: num, name: newCourseName }],
    }));
    setStickyMetadata((prev) => ({
      ...prev,
      courseNumber: num,
      courseName: newCourseName,
    }));
    toast.success("Course set!");
  };

  const handleCreateProfessor = async (name: string) => {
    // Just update local state
    setProfessors((prev) => [...prev, name]);
  };

  // --- HELPER: GENERATE FILENAME ---
  const generateFilename = (ext: string) => {
    const {
      department,
      courseNumber,
      assessmentType,
      professor,
      year,
      version,
    } = stickyMetadata;
    const sem = stickyMetadata.semester || "Unknown";
    const prof = professor || "Unknown";
    const yr = year || "0";

    // Format: CSCI1200_Exam1_Cutler_Spring_2025_Student.pdf
    const name = `${department}${courseNumber}_${assessmentType}_${prof}_${sem}_${yr}_${version}.${ext}`;
    return name.replace(/\s+/g, ""); // Remove spaces
  };

  // --- SUBMIT ---

  const handleSubmit = async () => {
    if (!currentFile || !user) return;
    setIsSubmitting(true);
    const toastId = toast.loading("Processing...");

    try {
      let fileToUpload: File = currentFile;
      const stdName = generateFilename("pdf");
      const currentSem = stickyMetadata.semester || "Unknown";

      // Generate JWT once for all server actions
      const { jwt } = await account.createJWT();

      // 0. CHECK FOR DUPLICATES
      toast.loading("Checking for duplicates...", { id: toastId });
      const isDuplicate = await checkDuplicateResourceAction(
        {
          department: stickyMetadata.department,
          courseNumber: stickyMetadata.courseNumber,
          assessmentType: stickyMetadata.assessmentType,
          semester: currentSem,
          year: stickyMetadata.year,
          version: stickyMetadata.version,
        },
        jwt,
      ); // Pass JWT

      if (isDuplicate) {
        toast.error("This exam already exists!", { id: toastId });
        setIsSubmitting(false);
        return;
      }

      // 1. DETERMINE FILE VERSION
      if (stickyMetadata.version === "Student") {
        if (!redactorRef.current) throw new Error("Redactor not loaded");
        toast.loading("Burning redactions...", { id: toastId });
        const redactedBlob = await redactorRef.current.processRedactions();
        fileToUpload = new File([redactedBlob], stdName, {
          type: "application/pdf",
        });
      } else {
        fileToUpload = new File([currentFile], stdName, {
          type: "application/pdf",
        });
      }

      // 2. UPLOAD TO STORAGE
      toast.loading("Uploading File...", { id: toastId });

      // Use jwt generated earlier
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("jwt", jwt); // Pass JWT

      // We need a server action that accepts FormData for upload
      const uploadRes = await uploadFileAction(formData);
      if (!uploadRes || !uploadRes.$id) throw new Error("Upload failed");

      // 3. SUBMIT METADATA TO API
      toast.loading("Finalizing Record...", { id: toastId });

      const currentDeptCourses = courseData[stickyMetadata.department] || [];
      const matchedCourse = currentDeptCourses.find(
        (c) => c.number === stickyMetadata.courseNumber,
      );
      const courseName = matchedCourse
        ? matchedCourse.name
        : stickyMetadata.courseName || "";

      const resourceData = {
        fileId: uploadRes.$id,
        metadata: {
          ...stickyMetadata,
          courseName,
          semester: currentSem,
          standardizedFilename: stdName,
        },
      };

      // Generate JWT for secure server-side verification
      // WE ALREADY HAVE JWT from step 2 (Upload)
      // const { jwt } = await account.createJWT(); <--- REMOVED
      await createLibraryResourceAction(resourceData, jwt);

      toast.success("Success! (+10 PTS)", { id: toastId });
      removeCurrentFileFromQueue();
    } catch (err) {
      console.error(err);
      toast.error("Upload failed.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helpers
  const deptOptions = Object.keys(courseData).sort();
  const courseOptions = (courseData[stickyMetadata.department] || [])
    .map((c) => c.number)
    .sort();

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 relative">
      {/* LEFT COLUMN: WORKSPACE */}
      <div
        className={`flex-1 flex flex-col overflow-hidden border-2 transition-all ${
          !currentFile
            ? isDragging
              ? "border-fiji-purple bg-fiji-purple/5 border-dashed"
              : "border-stone-300 border-dashed bg-stone-50"
            : "border-stone-200 bg-stone-200 shadow-inner"
        }`}
      >
        {!currentFile ? (
          <label
            className="flex-1 flex flex-col items-center justify-center cursor-pointer relative"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="bg-white p-6 rounded-full shadow-lg mb-4">
              <UploadCloud
                className={`w-10 h-10 ${
                  isDragging ? "text-fiji-purple" : "text-stone-400"
                }`}
              />
            </div>
            <h3 className="font-bebas text-2xl text-stone-600">
              Drag & Drop Exams
            </h3>
            <p className="text-stone-400 text-sm">PDF Files Only</p>
            <input
              type="file"
              className="hidden"
              accept="application/pdf"
              multiple
              onChange={handleFileSelect}
            />
          </label>
        ) : (
          <>
            <div className="h-12 bg-white border-b border-stone-200 flex items-center justify-between px-4">
              <div className="flex items-center gap-2 text-sm font-bold text-stone-700 truncate">
                <FileText className="w-4 h-4 text-fiji-purple" />
                <span className="truncate max-w-[200px]">
                  {currentFile.name}
                </span>
              </div>
              <button
                onClick={removeCurrentFileFromQueue}
                className="text-stone-400 hover:text-red-500 transition-colors p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 relative bg-stone-500 overflow-hidden">
              <PdfRedactor ref={redactorRef} file={currentFile} />
            </div>
          </>
        )}
      </div>

      {/* RIGHT COLUMN: METADATA FORM */}
      <div className="w-full lg:w-80 bg-white border border-stone-200 p-4 shadow-sm flex flex-col overflow-y-auto">
        <div className="mb-6">
          <h2 className="font-bebas text-3xl text-fiji-dark">Exam Details</h2>
          <p className="text-sm text-stone-500">
            {dataLoading
              ? "Syncing course data..."
              : queueLength > 0
                ? `${queueLength} file(s) in queue`
                : "Waiting for files..."}
          </p>
        </div>

        <div
          className={`space-y-4 transition-opacity ${
            !currentFile || dataLoading
              ? "opacity-50 pointer-events-none"
              : "opacity-100"
          }`}
        >
          {/* DEPT & COURSE */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <Combobox
                label="Dept"
                placeholder="CSCI"
                value={stickyMetadata.department}
                options={deptOptions}
                onChange={(val) =>
                  setStickyMetadata((p) => ({
                    ...p,
                    department: val.toUpperCase(),
                    courseNumber: "",
                  }))
                }
                onCreate={handleCreateDept}
              />
            </div>
            <div className="col-span-2">
              <Combobox
                label="Number"
                placeholder="1100"
                value={stickyMetadata.courseNumber}
                options={courseOptions}
                onChange={(val) =>
                  setStickyMetadata((p) => ({ ...p, courseNumber: val }))
                }
                onCreate={handleCreateCourseNumber}
              />
            </div>
          </div>

          {/* PROFESSOR */}
          <Combobox
            label="Professor"
            placeholder="Last Name"
            value={stickyMetadata.professor}
            options={professors}
            onChange={(val) =>
              setStickyMetadata((p) => ({ ...p, professor: val }))
            }
            onCreate={handleCreateProfessor}
          />

          {/* TYPE / SEMESTER / YEAR (Updated Grid) */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
                Type
              </label>
              <select
                className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50"
                value={stickyMetadata.assessmentType}
                onChange={(e) =>
                  setStickyMetadata((p) => ({
                    ...p,
                    assessmentType: e.target.value,
                  }))
                }
              >
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
                Semester
              </label>
              <select
                className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50"
                value={stickyMetadata.semester || "Unknown"}
                onChange={(e) =>
                  setStickyMetadata((p) => ({ ...p, semester: e.target.value }))
                }
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
                Year
              </label>
              <input
                type="number"
                className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50"
                value={stickyMetadata.year}
                onChange={(e) =>
                  setStickyMetadata((p) => ({ ...p, year: e.target.value }))
                }
              />
            </div>
          </div>

          {/* VERSION (Unchanged) */}
          <div
            className={`p-3 rounded border transition-colors ${
              stickyMetadata.version === "Student"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <label
              className={`text-[10px] font-bold uppercase ${
                stickyMetadata.version === "Student"
                  ? "text-yellow-600"
                  : "text-blue-600"
              }`}
            >
              Version
            </label>
            <select
              className="w-full p-2 border rounded text-sm bg-white mt-1 border-stone-200"
              value={stickyMetadata.version}
              onChange={(e) =>
                setStickyMetadata((p) => ({ ...p, version: e.target.value }))
              }
            >
              {VERSIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <div className="flex items-start gap-2 mt-2">
              {stickyMetadata.version === "Student" ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                  <p className="text-[10px] text-yellow-700 leading-tight">
                    <strong>Action Required:</strong> Draw boxes over names.
                  </p>
                </>
              ) : (
                <>
                  <Info className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-[10px] text-blue-700 leading-tight">
                    <strong>Professor Copy:</strong> Redactions ignored.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ACTION BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !stickyMetadata.courseNumber}
            className={`w-full mt-4 text-white py-3 rounded-lg font-bebas text-xl tracking-wide transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
              stickyMetadata.version === "Student"
                ? "bg-stone-800 hover:bg-black shadow-stone-200"
                : "bg-fiji-purple hover:bg-fiji-dark shadow-purple-200"
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : stickyMetadata.version === "Student" ? (
              <>
                <Check className="w-4 h-4" /> Burn & Upload
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" /> Upload Raw
              </>
            )}
          </button>

          {/* SKIP BUTTON */}
          <button
            onClick={removeCurrentFileFromQueue}
            disabled={isSubmitting}
            className="w-full mt-2 py-2 text-stone-400 font-bold hover:text-red-500 hover:bg-stone-50 rounded transition-colors text-sm"
          >
            Skip File
          </button>
        </div>
      </div>

      {/* NEW COURSE MODAL */}
      {isNamingCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
            <h3 className="font-bebas text-2xl mb-2">New Course Detected</h3>
            <p className="text-sm text-stone-500 mb-4">
              You are creating{" "}
              <strong>
                {stickyMetadata.department} {pendingCourseNumber}
              </strong>
              . <br />
              What is the full name of this course?
            </p>
            <input
              autoFocus
              className="w-full p-3 border border-stone-300 rounded mb-4"
              placeholder="e.g. Intro to Astronomy"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsNamingCourse(false)}
                className="flex-1 py-2 text-stone-500 font-bold hover:bg-stone-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitNewCourse}
                disabled={!newCourseName}
                className="flex-1 py-2 bg-fiji-purple text-white font-bold rounded hover:bg-fiji-dark disabled:opacity-50"
              >
                Create Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
