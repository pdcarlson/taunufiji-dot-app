"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// --- Loading Component ---
const PageLoading = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-fiji-purple border-r-transparent" />
  </div>
);

interface PdfRedactorProps {
  file: File;
}

export interface PdfRedactorRef {
  processRedactions: () => Promise<Blob>;
}

const PdfRedactor = forwardRef<PdfRedactorRef, PdfRedactorProps>(
  ({ file }, ref) => {
    const [pdfJsDoc, setPdfJsDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1.0);
    const [isPageRendering, setIsPageRendering] = useState(false);
    const [redactionBoxes, setRedactionBoxes] = useState<Record<number, any[]>>(
      {}
    );
    const [isDrawing, setIsDrawing] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const renderTaskRef = useRef<any>(null);
    const drawingStartPos = useRef<{ x: number; y: number } | null>(null);
    const currentBoxRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- EFFECT 1: Load Doc ---
    useEffect(() => {
      if (!file) return;
      setPdfJsDoc(null);
      setCurrentPage(1);
      setNumPages(0);
      setRedactionBoxes({});

      const loadDocs = async () => {
        try {
          // IMPORTANT: Update standard font path or worker src if needed for Next.js 15
          // Using standard CDN for worker in internal-os to ensure compatibility if local missing
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          
          const fileBuffer = await file.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({ data: fileBuffer });
          const doc = await loadingTask.promise;
          setPdfJsDoc(doc);
          setNumPages(doc.numPages);
        } catch (err) {
          console.error("Failed to load PDF:", err);
        }
      };
      loadDocs();
    }, [file]);

    // --- EFFECT 2: Render Page ---
    useLayoutEffect(() => {
      if (!pdfJsDoc || !containerRef.current) return;
      if (renderTaskRef.current) renderTaskRef.current.cancel();

      const loadPage = async () => {
        setIsPageRendering(true);
        try {
          const page = await pdfJsDoc.getPage(currentPage);
          const viewport = page.getViewport({ scale: 1.0 });

          // Fit to width mostly, but ensure height fits reasonably
          const containerWidth = containerRef.current!.clientWidth;
          const containerHeight = containerRef.current!.clientHeight;
          const scaleToWidth = (containerWidth - 40) / viewport.width; // 20px padding
          const scaleToHeight = (containerHeight - 40) / viewport.height;
          const newScale = Math.min(scaleToWidth, scaleToHeight);

          setScale(newScale);

          const scaledViewport = page.getViewport({ scale: newScale });
          const canvas = canvasRef.current;
          if (!canvas) return;

          const context = canvas.getContext("2d");
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;

          renderTaskRef.current = page.render({
            canvasContext: context!,
            viewport: scaledViewport,
          });
          await renderTaskRef.current.promise;
          setIsPageRendering(false);
          renderTaskRef.current = null;
        } catch (err: any) {
          if (err.name !== "RenderingCancelledException")
            console.error("Render error:", err);
          setIsPageRendering(false);
        }
      };
      loadPage();

      return () => {
        if (renderTaskRef.current) renderTaskRef.current.cancel();
      };
    }, [pdfJsDoc, currentPage]);

    // --- CONTROLS ---
    const handlePrevPage = useCallback(() => {
      if (!isPageRendering) setCurrentPage((prev) => Math.max(prev - 1, 1));
    }, [isPageRendering]);

    const handleNextPage = useCallback(() => {
      if (!isPageRendering)
        setCurrentPage((prev) => Math.min(prev + 1, numPages));
    }, [isPageRendering, numPages]);

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowLeft") handlePrevPage();
        else if (event.key === "ArrowRight") handleNextPage();
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handlePrevPage, handleNextPage]);

    // --- DRAWING HANDLERS ---
    const getCoords = (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (isPageRendering) return;
      setIsDrawing(true);
      drawingStartPos.current = getCoords(e);
      currentBoxRef.current = {
        x: drawingStartPos.current.x,
        y: drawingStartPos.current.y,
        width: 0,
        height: 0,
      };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing || !drawingStartPos.current) return;
      const currentPos = getCoords(e);
      const start = drawingStartPos.current;
      const width = currentPos.x - start.x;
      const height = currentPos.y - start.y;

      currentBoxRef.current = {
        x: width > 0 ? start.x : currentPos.x,
        y: height > 0 ? start.y : currentPos.y,
        width: Math.abs(width),
        height: Math.abs(height),
      };
      setRedactionBoxes((prev) => ({ ...prev }));
    };

    const handleMouseUp = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      const newBox = currentBoxRef.current;
      if (newBox && newBox.width > 5 && newBox.height > 5) {
        setRedactionBoxes((prev) => ({
          ...prev,
          [currentPage]: [...(prev[currentPage] || []), newBox],
        }));
      }
      currentBoxRef.current = null;
      drawingStartPos.current = null;
    };

    // --- BURN PROCESS ---
    useImperativeHandle(ref, () => ({
      processRedactions: async () => {
        if (!pdfJsDoc || !scale) throw new Error("Document not ready");
        const renderScale = 2.0;
        const newPdfDoc = await PDFDocument.create();

        for (let i = 1; i <= pdfJsDoc.numPages; i++) {
          const page = await pdfJsDoc.getPage(i);
          const viewport = page.getViewport({ scale: renderScale });
          const offscreenCanvas = document.createElement("canvas");
          offscreenCanvas.width = viewport.width;
          offscreenCanvas.height = viewport.height;
          const ctx = offscreenCanvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport }).promise;

          const boxes = redactionBoxes[i] || [];
          ctx.fillStyle = "black";
          for (const box of boxes) {
            const trueX = (box.x / scale) * renderScale;
            const trueY = (box.y / scale) * renderScale;
            const trueWidth = (box.width / scale) * renderScale;
            const trueHeight = (box.height / scale) * renderScale;
            ctx.fillRect(trueX, trueY, trueWidth, trueHeight);
          }

          const pngDataUrl = offscreenCanvas.toDataURL("image/png");
          const pngImage = await newPdfDoc.embedPng(pngDataUrl);
          const newPage = newPdfDoc.addPage([viewport.width, viewport.height]);
          newPage.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
          });
        }
        const pdfBytes = await newPdfDoc.save();
        return new Blob([new Uint8Array(pdfBytes)], {
          type: "application/pdf",
        });
      },
    }));

    const boxesOnThisPage = [...(redactionBoxes[currentPage] || [])];
    if (isDrawing && currentBoxRef.current)
      boxesOnThisPage.push(currentBoxRef.current);

    return (
      <div className="flex h-full w-full flex-col items-center justify-center relative bg-stone-900/5">
        {/* CONTAINER */}
        <div
          ref={containerRef}
          className="relative h-full w-full flex items-center justify-center overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas
            ref={canvasRef}
            className="shadow-2xl transition-transform duration-200 ease-out"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              visibility: isPageRendering ? "hidden" : "visible",
            }}
          />

          {/* OVERLAY */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: canvasRef.current ? canvasRef.current.style.top : "50%",
              left: canvasRef.current ? canvasRef.current.style.left : "50%",
              transform: canvasRef.current
                ? canvasRef.current.style.transform
                : "translate(-50%, -50%)",
              width: canvasRef.current ? canvasRef.current.width : 0,
              height: canvasRef.current ? canvasRef.current.height : 0,
            }}
          >
            {boxesOnThisPage.map((box, index) => (
              <div
                key={index}
                className="absolute bg-black/80 border border-white/20"
                style={{
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                }}
              />
            ))}
          </div>

          {isPageRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100/50 backdrop-blur-sm z-10">
              <PageLoading />
            </div>
          )}
        </div>

        {/* FLOATING CONTROLS */}
        {numPages > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-stone-800 text-white px-2 py-2 rounded-xl shadow-2xl flex items-center gap-2 border border-stone-700/50 backdrop-blur-md">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || isPageRendering}
              className="p-2 hover:bg-stone-700 rounded-lg disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="px-3 font-mono text-sm font-bold min-w-[80px] text-center select-none">
              {currentPage} / {numPages}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= numPages || isPageRendering}
              className="p-2 hover:bg-stone-700 rounded-lg disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  }
);

PdfRedactor.displayName = "PdfRedactor";
export default PdfRedactor;
