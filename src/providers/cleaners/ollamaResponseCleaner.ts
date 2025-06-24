import * as vscode from "vscode";

/**
 * Cleans up the response from Ollama API
 * @param response
 * @param document
 * @param position
 * @returns
 */
export function cleanAIResponse(
  response: string,
  document: vscode.TextDocument,
  position: vscode.Position
): string {
  if (!response.trim()) {
    return "";
  }

  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);
  const baseIndentation = linePrefix.match(/^\s*/)?.[0] || "";

  // Extract code between markdown code fence markers
  const codeBlockMatch = response.match(/```(?:\w+)?\n([\s\S]*?)```/);

  if (codeBlockMatch) {
    response = codeBlockMatch[1];
  }

  // Split into lines and process while preserving relative indentation.
  const lines = response.split("\n");

  // Find min indent level (ignore empty lines)
  const minIndent = Math.min(
    ...lines
      .filter((line) => line.trim())
      .map((line) => {
        const match = line.match(/^\s*/);
        return match ? match[0].length : 0;
      })
  );

  // Process lines while preserving relative indentation
  let cleaned = lines
    .map((line) => {
      if (!line.trim() || line.startsWith("```")) {
        return "";
      }
      const match = line.match(/^\s*/);
      const lineIndent = match ? match[0] : "";
      const relativeIndent = " ".repeat(
        Math.max(0, lineIndent.length - minIndent)
      );
      return baseIndentation + relativeIndent + line.trim();
    })
    .filter(Boolean) // Remove empty lines
    .join("\n");

  // Context-specific adjustments
  if (/['"`]$/.test(linePrefix)) {
    cleaned = cleaned.replace(/['"`]/g, ""); // strip quotes for string literals
  } else if (/{$/.test(linePrefix.trim())) {
    cleaned = cleaned
      .split("\n")
      .map((line, i) => (i === 0 ? line : baseIndentation + " " + line.trim()))
      .join("\n");
  } else if (linePrefix.trim().endsWith("=")) {
    cleaned = cleaned.replace(/;\s*$/, ""); // Remove trailing semicolon after '='
  }

  return cleaned;
}

export function getUniqueCompletion(
  completion: string,
  linePrefix: string
): string | undefined {
  if (!completion.trim()) {
    return;
  }

  const prefixTrimmed = linePrefix.trim();

  if (prefixTrimmed && completion.startsWith(prefixTrimmed)) {
    return completion.substring(prefixTrimmed.length).trim();
  }

  return completion;
}
