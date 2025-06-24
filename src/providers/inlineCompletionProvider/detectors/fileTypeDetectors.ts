/**
 * Functions for detecting file types based on file extensions
 */

/**
 * Checks if file is Markdown
 * @param extension
 */
export function isMarkdownFile(extension: string): boolean {
  return ["md", "markdown"].includes(extension);
}

/**
 * Checks if file is HTML
 * @param extension
 */
export function isHTMLFile(extension: string): boolean {
  return ["html", "htm", "xhtml", "jsx", "tsx", "vue", "svelte"].includes(
    extension
  );
}

/**
 * Checks if the file is CSS
 * @param extension
 */
export function isCSSFile(extension: string): boolean {
  return ["css", "scss", "sass", "less", "styl"].includes(extension);
}

/**
 * Checks if the file is JSON
 * @param extension
 */
export function isJSONFile(extension: string): boolean {
  return ["json", "jsonc", "json5"].includes(extension);
}

/**
 * Checks if file is SQL
 */
export function isSQLFile(extension: string): boolean {
  return ["sql", "mysql", "pgsql", "sqlite"].includes(extension);
}
