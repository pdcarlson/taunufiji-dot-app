"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { ASSESSMENT_TYPES, SEMESTERS, VERSIONS } from "@/lib/courseData";

// Define our types to avoid "any" soup
export interface MetadataType {
  department: string;
  courseNumber: string;
  courseName: string;
  professor: string;
  assessmentType: string;
  year: string | number;
  semester: string;
  version: string;
  standardizedFilename?: string;
}

interface UploadContextType {
  queue: File[];
  addFilesToQueue: (files: FileList | File[]) => void;
  removeCurrentFileFromQueue: () => void;
  currentFile: File | undefined;
  queueLength: number;
  processingMetadata: MetadataType | null;
  setProcessingMetadata: (data: MetadataType | null) => void;
  stickyMetadata: MetadataType;
  setStickyMetadata: React.Dispatch<React.SetStateAction<MetadataType>>;
}

const UploadQueueContext = createContext<UploadContextType | undefined>(
  undefined
);

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<File[]>([]);
  const [processingMetadata, setProcessingMetadata] =
    useState<MetadataType | null>(null);

  // "Sticky" state: Remembers your inputs so you don't have to re-type "CSCI 1200" 50 times.
  const [stickyMetadata, setStickyMetadata] = useState<MetadataType>({
    department: "CSCI",
    courseNumber: "",
    courseName: "",
    professor: "",
    assessmentType: ASSESSMENT_TYPES[0],
    year: new Date().getFullYear(),
    semester: SEMESTERS[0],
    version: VERSIONS[0],
  });

  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const filesArray = Array.from(files);
    setQueue((prev) => [...prev, ...filesArray]);
  }, []);

  const removeCurrentFileFromQueue = useCallback(() => {
    setQueue((prev) => prev.slice(1));
    setProcessingMetadata(null);
  }, []);

  return (
    <UploadQueueContext.Provider
      value={{
        queue,
        addFilesToQueue,
        removeCurrentFileFromQueue,
        currentFile: queue[0],
        queueLength: queue.length,
        processingMetadata,
        setProcessingMetadata,
        stickyMetadata,
        setStickyMetadata,
      }}
    >
      {children}
    </UploadQueueContext.Provider>
  );
}

export const useUploadQueue = () => {
  const context = useContext(UploadQueueContext);
  if (context === undefined) {
    throw new Error(
      "useUploadQueue must be used within an UploadQueueProvider"
    );
  }
  return context;
};
