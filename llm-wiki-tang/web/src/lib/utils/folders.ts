/**
 * Get the immediate child folder names at a given path.
 *
 * Given folders = ["/", "/Reports/", "/Reports/2024/", "/Invoices/"]
 * and currentPath = "/", returns ["Reports", "Invoices"]
 *
 * Given currentPath = "/Reports/", returns ["2024"]
 */
export function getChildFolderNames(folders: string[], currentPath: string): string[] {
  const names = new Set<string>()
  const prefix = currentPath.endsWith('/') ? currentPath : currentPath + '/'

  for (const folder of folders) {
    if (folder === prefix || !folder.startsWith(prefix)) continue
    const rest = folder.slice(prefix.length)
    const slashIdx = rest.indexOf('/')
    const name = slashIdx === -1 ? rest : rest.slice(0, slashIdx)
    if (name) names.add(name)
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b))
}

/**
 * Build an absolute folder path from a parent path and folder name.
 * joinPath("/", "Reports") => "/Reports/"
 * joinPath("/Reports/", "2024") => "/Reports/2024/"
 */
export function joinPath(parentPath: string, folderName: string): string {
  const base = parentPath.endsWith('/') ? parentPath : parentPath + '/'
  return base + folderName + '/'
}

/**
 * Parse a path into breadcrumb segments.
 * "/" => [{ label: "Root", path: "/" }]
 * "/Reports/2024/" => [
 *   { label: "Root", path: "/" },
 *   { label: "Reports", path: "/Reports/" },
 *   { label: "2024", path: "/Reports/2024/" },
 * ]
 */
export function parseBreadcrumbs(currentPath: string): { label: string; path: string }[] {
  const segments: { label: string; path: string }[] = [{ label: 'Root', path: '/' }]
  if (currentPath === '/') return segments

  const parts = currentPath.split('/').filter(Boolean)
  let accumulated = '/'
  for (const part of parts) {
    accumulated += part + '/'
    segments.push({ label: part, path: accumulated })
  }

  return segments
}

/**
 * Get parent path.
 * "/Reports/2024/" => "/Reports/"
 * "/Reports/" => "/"
 * "/" => "/"
 */
export function getParentPath(path: string): string {
  if (path === '/') return '/'
  // Remove trailing slash, find last slash, keep everything up to and including it
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path
  const lastSlash = trimmed.lastIndexOf('/')
  return lastSlash <= 0 ? '/' : trimmed.slice(0, lastSlash + 1)
}

/**
 * Check if childPath is a descendant of parentPath.
 * isDescendant("/Reports/2024/", "/Reports/") => true
 * isDescendant("/Reports/", "/Reports/") => false (same path is not a descendant)
 * isDescendant("/Other/", "/Reports/") => false
 */
export function isDescendant(childPath: string, parentPath: string): boolean {
  return childPath !== parentPath && childPath.startsWith(parentPath)
}

/**
 * When renaming/moving a folder, compute the new path for descendants.
 * rebasePath("/Reports/2024/Q1/", "/Reports/", "/Archive/Reports/")
 * => "/Archive/Reports/2024/Q1/"
 */
export function rebasePath(path: string, oldPrefix: string, newPrefix: string): string {
  if (!path.startsWith(oldPrefix)) return path
  return newPrefix + path.slice(oldPrefix.length)
}

/**
 * Filter documents to those at exactly `currentPath` (not nested deeper).
 */
export function filterDocumentsAtPath<T extends { path?: string | null }>(documents: T[], currentPath: string): T[] {
  return documents.filter((doc) => (doc.path ?? '/') === currentPath)
}
