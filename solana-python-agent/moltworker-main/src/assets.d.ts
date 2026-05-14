// Type declarations for static asset imports
// These are handled by Wrangler's module rules at runtime

declare module '*.html' {
  const content: string;
  export default content;
}

declare module '*.png' {
  // Vite compiles PNG imports to URL paths (strings), not binary data
  const content: string;
  export default content;
}
