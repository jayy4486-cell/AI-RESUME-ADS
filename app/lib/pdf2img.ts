export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  isLoading = true;
  // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not a module
  loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
    // Prefer a CDN worker that matches the library version to avoid
    // API/Worker version mismatches (common cause of UnknownErrorException).
    // Update this constant if you update `pdfjs-dist` in package.json.
    const PDFJS_VERSION = "5.4.449";
    const cdnWorker = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

    // Default to CDN worker, but keep a local fallback if the CDN is blocked.
    try {
      lib.GlobalWorkerOptions.workerSrc = cdnWorker;
    } catch (e) {
      // If setting the CDN worker fails for some reason, fall back to local file.
      // This keeps backwards compatibility with projects that bundle the worker locally.
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      // eslint-disable-next-line no-console
      console.warn("pdf2img: failed to set CDN worker, falling back to /pdf.worker.min.mjs", e);
    }

    pdfjsLib = lib;
    isLoading = false;
    return lib;
  });

  return loadPromise;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    const lib = await loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    // Create a viewport at scale=1 then compute a safe scale so we don't
    // create huge canvases that can crash the browser. Keep scale <= 4.
    const baseViewport = page.getViewport({ scale: 1 });
    const MAX_DIMENSION = 2048; // safe max canvas width/height
    const targetMax = Math.max(baseViewport.width, baseViewport.height);
    let scale = Math.min(4, Math.max(1, MAX_DIMENSION / targetMax));

    // Ensure scale is a reasonable float (not NaN or Infinity)
    if (!isFinite(scale) || Number.isNaN(scale)) scale = 1;

    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    // Use integer sizes for the canvas
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    if (context) {
      context.imageSmoothingEnabled = true;
      // @ts-ignore - some browsers allow string quality
      context.imageSmoothingQuality = "high";
    }

    // Render page onto canvas
    await page.render({ canvasContext: context!, viewport }).promise;

    // Convert canvas to blob (with fallback to dataURL conversion)
    const toBlobAsync = (): Promise<Blob | null> =>
      new Promise((resolve) => {
        if (canvas.toBlob) {
          canvas.toBlob((b) => resolve(b), "image/png", 1.0);
        } else {
          try {
            const dataUrl = canvas.toDataURL("image/png", 1.0);
            // convert dataURL to blob
            fetch(dataUrl)
              .then((res) => res.blob())
              .then((b) => resolve(b))
              .catch(() => resolve(null));
          } catch (e) {
            resolve(null);
          }
        }
      });

    const blob = await toBlobAsync();
    if (!blob) {
      return {
        imageUrl: "",
        file: null,
        error: "Failed to create image blob",
      };
    }

    const originalName = file.name.replace(/\.pdf$/i, "");
    const imageFile = new File([blob], `${originalName}.png`, {
      type: "image/png",
    });

    return {
      imageUrl: URL.createObjectURL(blob),
      file: imageFile,
    };
  } catch (err) {
    // Detect common worker/library version mismatch errors and provide
    // a clearer suggestion to the user.
    const msg = String(err);
    let userMessage = `Failed to convert PDF: ${msg}`;
    if (msg.includes("API version") && msg.includes("Worker version")) {
      userMessage =
        "Failed to convert PDF: pdf.js API/Worker version mismatch. " +
        "The pdf.worker script served to the browser does not match the installed pdfjs-dist version. " +
        "Try replacing the local `/pdf.worker.min.mjs` with the worker from the same pdfjs-dist version or allow the app to load the CDN worker. See console for details.";
    }

    return {
      imageUrl: "",
      file: null,
      error: userMessage,
    };
  }
}
