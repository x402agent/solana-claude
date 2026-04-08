import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const FILENAME_BAD_CHARS = /[/\\:*?"<>|]/g

/** Strip characters that are invalid in filenames */
export function sanitizeTitle(title: string): string {
  return title.replace(FILENAME_BAD_CHARS, '')
}

/** Convert a note title to a safe filename */
export function toNoteFilename(title: string): string {
  const clean = sanitizeTitle(title)
  const base = clean || 'Untitled'
  return base.endsWith('.md') ? base : base + '.md'
}
