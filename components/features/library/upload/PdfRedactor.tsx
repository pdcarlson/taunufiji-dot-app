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
import { PDFDocumentProxy, RenderTask } from "pdfjs-dist/types/src/display/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

// --- Loading Component ---
const PageLoading = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-fiji-purple border-r-transparent" />
  </div>
);

interface RedactionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PdfRedactorProps {
  file: File;
}

export interface PdfRedactorRef {
  processRedactions: () => Promise<Blob>;
}

const PdfRedactor = forwardRef<PdfRedactorRef, PdfRedactorProps>(
  ({ file }, ref) => {
    const [pdfJsDoc, setPdfJsDoc] = useState<PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [numPages, setNumPages] = useState(0);
    const [baseScale, setBaseScale] = useState(1.0); // Fit-to-screen scale
    const [zoomLevel, setZoomLevel] = useState(1.0); // User multiplier
    const [isPageRendering, setIsPageRendering] = useState(false);
    const [redactionBoxes, setRedactionBoxes] = useState<Record<number, RedactionBox[]>>(
      {},
    );
    const [isDrawing, setIsDrawing] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const [canvasDims, setCanvasDims] = useState<{
      width: number;
      height: number;
    } | null>(null);
    const [currentDrawingBox, setCurrentDrawingBox] = useState<RedactionBox | null>(null); // State for active drawing

    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Derived scale
    const scale = baseScale * zoomLevel;
    const renderTaskRef = useRef<RenderTask | null>(null);
    const drawingStartPos = useRef<{ x: number; y: number } | null>(null);
    const currentBoxRef = useRef<RedactionBox | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- EFFECT 1: Load Doc ---
    useEffect(() => {
      if (!file) return;
       
      const loadDocs = async () => {
        setPdfJsDoc(null);
        setCurrentPage(1);
        setNumPages(0);
        setRedactionBoxes({});

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
    }, [file, reloadKey]);

    // --- EFFECT 2: Render Page ---
    useLayoutEffect(() => {
      if (!pdfJsDoc || !containerRef.current) return;
      if (renderTaskRef.current) renderTaskRef.current.cancel();

      const loadPage = async () => {
        setIsPageRendering(true);
        try {
          const page = await pdfJsDoc.getPage(currentPage);
          const viewport = page.getViewport({ scale: 1.0 });

          // TIGHT FIT: Reduce padding to nearly zero (10px buffer)
          const containerWidth = containerRef.current!.clientWidth;
          const containerHeight = containerRef.current!.clientHeight;

          // Calculate base scale to fit container tightly
          const scaleToWidth = (containerWidth - 10) / viewport.width;
          const scaleToHeight = (containerHeight - 10) / viewport.height;
          const newBaseScale = Math.min(scaleToWidth, scaleToHeight);

          setBaseScale(newBaseScale);

          // Render at the EFFECTIVE scale (Base * Zoom)
          // For high quality zoom, we should ideally render at higher res,
          // but for performance, we might just scale the canvas via CSS transform?
          // Actually, PDF.js looks blurry if we CSS scale up. Best to re-render.
          const effectiveScale = newBaseScale * zoomLevel;

          const scaledViewport = page.getViewport({ scale: effectiveScale });
          const canvas = canvasRef.current;
          if (!canvas) return;

          const context = canvas.getContext("2d");
          canvas.width = scaledViewport.width;
          canvas.height = scaledViewport.height;
          setCanvasDims({
            width: scaledViewport.width,
            height: scaledViewport.height,
          });

          renderTaskRef.current = page.render({
            canvasContext: context!,
            viewport: scaledViewport,
            canvas: canvas,
          });
          await renderTaskRef.current.promise;
          setIsPageRendering(false);
          renderTaskRef.current = null;
        } catch (err: unknown) {
          if (
            err instanceof Error &&
            err.name !== "RenderingCancelledException"
          )
            console.error("Render error:", err);
          setIsPageRendering(false);
        }
      };
      loadPage();

      return () => {
        if (renderTaskRef.current) renderTaskRef.current.cancel();
      };
    }, [pdfJsDoc, currentPage, zoomLevel, reloadKey]); // Added zoomLevel and reloadKey dependency

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
      if (!canvas || !scale) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      // Convert screen pixels -> canvas pixels -> page coordinates
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
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

      const newBox = {
        x: width > 0 ? start.x : currentPos.x,
        y: height > 0 ? start.y : currentPos.y,
        width: Math.abs(width),
        height: Math.abs(height),
      };

      currentBoxRef.current = newBox;
      setCurrentDrawingBox(newBox); // Use state to trigger render
      // setRedactionBoxes((prev) => ({ ...prev })); // Removed this as it was just forcing update
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
      setCurrentDrawingBox(null);
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

          await page.render({
            canvasContext: ctx,
            viewport,
            canvas: offscreenCanvas,
          }).promise;

          const boxes = redactionBoxes[i] || [];
          ctx.fillStyle = "black";
          for (const box of boxes) {
            // box is in page coords (1.0 scale)
            const trueX = box.x * renderScale;
            const trueY = box.y * renderScale;
            const trueWidth = box.width * renderScale;
            const trueHeight = box.height * renderScale;
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
    if (isDrawing && currentDrawingBox) boxesOnThisPage.push(currentDrawingBox);

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
            className="shadow-2xl transition-transform duration-200 ease-out origin-center"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%)`, // Removed scale - canvas already rendered at correct size
              visibility: isPageRendering ? "hidden" : "visible",
            }}
          />

          {/* OVERLAY */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: "50%",
              left: "50%",
              transform: `translate(-50%, -50%)`,
              width: canvasDims ? canvasDims.width : 0,
              height: canvasDims ? canvasDims.height : 0,
            }}
          >
            {boxesOnThisPage.map((box, index) => (
              <div
                key={index}
                className="absolute bg-black/80 border border-white/20"
                style={{
                  left: `${box.x * scale}px`,
                  top: `${box.y * scale}px`,
                  width: `${box.width * scale}px`,
                  height: `${box.height * scale}px`,
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
            {/* Page Nav */}
            <div className="flex items-center gap-1 border-r border-stone-600 pr-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || isPageRendering}
                className="p-2 hover:bg-stone-700 rounded-lg disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="px-2 font-mono text-sm font-bold min-w-[60px] text-center select-none">
                {currentPage}/{numPages}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= numPages || isPageRendering}
                className="p-2 hover:bg-stone-700 rounded-lg disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-r border-stone-600 pr-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-2 hover:bg-stone-700 rounded-lg font-mono text-sm font-bold w-10"
                title="Zoom Out"
              >
                -
              </button>
              <span className="text-xs font-mono w-12 text-center text-stone-300">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.25))}
                className="p-2 hover:bg-stone-700 rounded-lg font-mono text-sm font-bold w-10"
                title="Zoom In"
              >
                +
              </button>
            </div>

            {/* Reload */}
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="p-2 hover:bg-stone-700 rounded-lg text-stone-300 hover:text-white transition-colors"
              title="Reload PDF"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-rotate-cw"
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  },
);

PdfRedactor.displayName = "PdfRedactor";
export default PdfRedactor;
