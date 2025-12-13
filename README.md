# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:


## AI Resume — README

This repository is an in-browser app that scans uploaded PDF resumes, converts the first PDF page to an image, uploads files to a Puter.js-backed runtime (FS/KV/AI), and requests AI feedback to produce ATS-like scoring and improvement tips.

This README summarizes how the project is organized, how to run it locally, common troubleshooting (including the pdf.js API/Worker version mismatch you encountered), and next steps.

Contents
- Purpose & stack
- Quick start
- Key files and what they do (detailed)
- Troubleshooting (pdf.worker version, auth issues)
- Recommended scripts and next steps

Purpose & stack
- Purpose: Provide automated ATS-style analysis of resumes using client-side PDF rendering and an AI feedback pipeline.
- Stack: React + TypeScript, Vite, React Router, Tailwind CSS, pdfjs-dist (client PDF rendering), Puter.js for runtime FS/AI/KV APIs, zustand for state.

Quick start
1) Install dependencies

```powershell
npm install
```

2) Development

```powershell
npm run dev
```

3) Open the app in your browser at the address printed by Vite (usually `http://localhost:5173`).

4) Go to `/auth` to sign in, then `/upload` to upload a resume PDF.

Key files and what they do — detailed

- `package.json`
	- Lists dependencies and scripts. Important deps: `pdfjs-dist`, `@heyputer/puter.js`, `react-dropzone`, `zustand`.

- `public/pdf.worker.min.mjs`
	- Local pdf.js worker script. THIS MUST MATCH the `pdfjs-dist` package version. If they differ you will see errors like: "API version \"5.4.449\" does not match the Worker version \"5.3.93\"." The app now prefers a CDN worker matching the library version but falls back to this file when necessary.

- `app/root.tsx`
	- Global layout and initialization. Injects the Puter.js runtime script (`https://js.puter.com/v2/`) and calls `usePuterStore().init()` to wait for `window.puter`.

- `app/lib/puter.ts`
	- Central Zustand store wrapping `window.puter` APIs. Exposes `auth`, `fs`, `ai`, and `kv` helpers to routes and components, and `init()` which polls for `window.puter`.

- `app/lib/pdf2img.ts`
	- Converts the first page of a `File` PDF into a PNG `File`. Key features:
		- Dynamically imports `pdfjs-dist/build/pdf.mjs`.
		- Sets `GlobalWorkerOptions.workerSrc` to a CDN URL matching `pdfjs-dist` or falls back to `/pdf.worker.min.mjs`.
		- Computes a safe canvas `scale` so resulting canvas width/height stay below a `MAX_DIMENSION` to avoid browser OOMs.
		- Uses `canvas.toBlob` with a `toDataURL` fallback.
		- Returns an object `{ imageUrl, file, error }` and surfaces helpful errors when conversion fails (including version mismatch detection).

- `app/routes/upload.tsx`
	- Upload form and orchestration:
		1. Upload the original PDF to `puter.fs.upload`
		2. Convert first page to image via `convertPdfToImage`
		3. Upload converted image
		4. Save metadata to `puter.kv`
		5. Call `puter.ai.feedback` with instructions constructed from the job description
		6. Parse AI response and navigate to `/resume/:id` to display results

- `app/components/FileUploader.tsx`
	- File input built on `react-dropzone`; accepts PDFs only and limits size to 20MB.

- `app/routes/auth.tsx`
	- Sign-in page using `puter.auth.signIn`. Now displays store `error` with Dismiss/Retry buttons to help collect the exact auth error (e.g. the A.3-0003 you saw).

- `app/routes/resume.tsx`, `home.tsx`, `wipe.tsx`
	- Routes for viewing analyzed resumes, the landing page, and an admin wipe page (respectively). They use `usePuterStore()` to guard and perform operations.

- `app/components/*` (ScoreBadge, ScoreCircle, ResumeCard, Summary, Details, etc.)
	- Presentational components for displaying the resume analysis and ATS scoring.

Troubleshooting — common issues and fixes

1) pdf.js API/Worker version mismatch (error you saw)
- Symptom: "Failed to convert PDF to image - Failed to convert PDF: UnknownErrorException: The API version \"5.4.449\" does not match the Worker version \"5.3.93\"."
- Cause: The `pdf.worker.min.mjs` file served to the browser is a different version than the `pdfjs-dist` library imported by the app.
- Quick fixes:
	- Copy the worker from `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` into `public/pdf.worker.min.mjs` to ensure versions match:

```powershell
Copy-Item -Path .\node_modules\pdfjs-dist\build\pdf.worker.min.mjs -Destination .\public\pdf.worker.min.mjs -Force
```

	- Or let the app load the CDN worker we configured (the app tries `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs`). Ensure your environment allows requests to `cdn.jsdelivr.net`.

2) Puter.js not available / auth errors
- Symptom: `Puter.js failed to load within 10 seconds` or auth error codes like `A.3-0003`.
- What to check:
	- Browser DevTools Console: `typeof window.puter` should be `object` after the Puter script loads.
	- Network tab: confirm `https://js.puter.com/v2/` loaded successfully and no CSP/adblock blocked it.
	- Popup blockers and third-party cookie settings can break popup-based login flows. Try disabling popup blockers or enabling third-party cookies.

3) Canvas / OOM / conversion failures
- Cause: Very large PDF pages rendered at high scale can exceed browser canvas limits.
- Mitigation: `pdf2img.ts` caps the rendered canvas dimension (`MAX_DIMENSION = 2048`) and computes a safe scale.

Recommended automated fix (optional)
- To avoid future worker mismatches, add a postinstall script to copy the worker into `public` automatically. Example (package.json):

```json
"scripts": {
	"postinstall": "node ./scripts/copy-pdf-worker.js"
}
```

And create a small Node script `scripts/copy-pdf-worker.js` that copies from `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` to `public/` in a cross-platform way.

If you want, I can add that script and the `postinstall` entry for you.

Development & testing notes
- Dev server: `npm run dev` (uses React Router dev server).
- Typecheck: `npm run typecheck` (runs `tsc` and react-router typegen).
- Build: `npm run build` and `npm run start` to serve the build.

What I changed already during debugging
- `app/lib/pdf2img.ts`: safer canvas scaling, CDN worker usage (with local fallback), better error messaging, and `toBlob` fallback.
- `app/routes/upload.tsx`: surface the conversion error string in UI status text.
- `app/components/FileUploader.tsx`: fixed stray token causing a syntax error.
- `app/routes/auth.tsx`: display auth store `error` and provide Dismiss/Retry buttons.

If you want this README expanded into a developer onboarding checklist, CI steps, or a one-click script to fix the worker file automatically, tell me which you'd prefer and I will add it.

---

If you'd like, I can now:
- Add `scripts/copy-pdf-worker.js` and update `package.json` with a `postinstall` script to copy the worker automatically (cross-platform Node script). 
- Or implement build-time detection of `pdfjs-dist` version and write it into `app/lib/pdf2img.ts`.

Tell me which automation you prefer and I will add it.
