import { pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export function ensurePdfWorker(): void {
  // Already configured above — this is a no-op guard for call sites
}

export { pdfjs }
