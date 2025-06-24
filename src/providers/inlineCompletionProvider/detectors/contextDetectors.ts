import * as vscode from "vscode";

/**
 * INFO: Functions for detecting the context of the cursor position
 */

/**
 * Check if the cursor is inside an object
 */
export function isInsideObjectLiteral(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  // Are we inside an object literal initilization?
  if (linePrefix.includes("{")) {
    const matches = linePrefix.match(/[{}\[\]()]/g) || [];
    let bracketCount = 0;

    for (const match of matches) {
      if (match === "{" || match === "[" || match === "(") {
        bracketCount++;
      }

      if (match === "}" || match === "]" || match === ")") {
        bracketCount--;
      }
    }

    return bracketCount > 0;
  }

  // Are we inside an object?
  let lineNo = position.line - 1;
  let bracketCount = 0;

  while (lineNo >= 0 && lineNo >= position.line - 5) {
    const line = document.lineAt(lineNo).text;
    const matches = line.match(/[{}\[\]()]/g) || [];

    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (match === "{" || match === "[" || match === "(") {
        bracketCount++;
      }

      if (match === "}" || match === "]" || match === ")") {
        bracketCount--;
      }
    }

    if (line.includes("=") && bracketCount > 0) {
      return true;
    }

    lineNo--;
  }

  return false;
}

// Is the cursor inside a console.log?
export function isInsideConsoleLog(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  return (
    linePrefix.includes("console.log(") &&
    !currentLine.substring(0, position.character).endsWith(")")
  );
}

/**
 * Is the cursor inside a string literal?
 * @param document
 * @param position
 */
export function isInsideStringLiteral(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  // Check for variable assignment to string
  const isStringAssignment = /(?:const|let|var|=)\s+\w+\s*=\s*(['"`])/.test(
    currentLine
  );
  console.log("Is string assingment:", isStringAssignment);

  // Check if cursor is right after an opening quote
  const isAfterOpeningQuote = /['"`]$/.test(linePrefix);
  console.log("Is after opening quote:", isAfterOpeningQuote);

  // Check if we're in an empty string (cursor between quotes)
  const isInEmptyString =
    /['"`]\s*['"`]/.test(currentLine) &&
    (linePrefix.endsWith("'") ||
      linePrefix.endsWith('"') ||
      linePrefix.endsWith("`"));
  console.log("Is in empty string:", isInEmptyString);

  // count quotes to determine if we're inside a string
  const singleQuotes = (linePrefix.match(/'/g) || []).length;
  const doubleQuotes = (linePrefix.match(/"/g) || []).length;
  const backticks = (linePrefix.match(/`/g) || []).length;

  console.log("Quote counts:", { singleQuotes, doubleQuotes, backticks });

  // If there's an odd number of any quote type, we're inside a string
  const isInString =
    singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0;
  console.log("Is inside string:", isInString);

  // Check for assignment to empty string
  const isInEmptyStringAssignment = /=\s*['"`]$/.test(linePrefix);
  console.log("Is empty string assignment:", isInEmptyStringAssignment);

  // Check if the line contains a string assignment and the cursor is after the equals sign
  const stringAssignmentMatch = currentLine.match(/(\w+)\s*=\s*(['"`])/);
  const isAfterEqualsInStringAssignment =
    stringAssignmentMatch !== null &&
    linePrefix.includes("=") &&
    linePrefix.indexOf("=") < position.character;

  console.log("Is after the equals sign in a string assignment");

  return (
    isInString ||
    isInEmptyStringAssignment ||
    isAfterOpeningQuote ||
    (isStringAssignment && isAfterEqualsInStringAssignment)
  );
}

/**
 * Is the cursor inside a function declaration?
 * @param document
 * @param position
 */
export function isInsideFunctionDeclaration(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  // Check for function declarations
  const functionPatterns = [
    /function\s+\w*\s*\([^]*$/, // JS/TS
    /def\s+\w*\s*\([^]*$/, // Python
    /public\s+\w+\s+\w+\s*\([^]*$/, // Java/C#
    /func\s+\w*\s*\([^]*$/, // Go
    /sub\s+\w*\s*\([^]*$/, // Perl/VB
    /fn\s+\w*\s*\([^]*$/, // Rust
  ];

  return functionPatterns.some((pattern) => pattern.test(linePrefix));
}

/**
 * Checks if cursor is inside a class declaration
 */
export function isInsideClassDeclaration(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  // Check for class declarations
  const classPatterns = [
    /class\s+\w*\s*{?$/, // JS/TS
    /class\s+\w*\s*\(.*\)\s*:?$/, // Python
    /interface\s+\w*\s*{?$/, // TS/Java interface
    /struct\s+\w*\s*{?$/, // Go/C struct
    /enum\s+\w*\s*{?$/, // TS/Java/C# enum
  ];

  return classPatterns.some((pattern) => pattern.test(linePrefix));
}

/**
 * Checks if cursor is inside an import statement
 */
export function isInsideImportStatement(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  // Check for import statements in various languages
  const importPatterns = [
    /import\s+.*$/, // JS/TS/Java import
    /from\s+.*\s+import\s+.*$/, // Python import
    /require\s*\(.*$/, // Node Require
    /using\s+.*$/, // C# using
    /#include\s+.*$/, // C/C++ include
  ];

  return importPatterns.some((pattern) => pattern.test(linePrefix));
}

/**
 * Checks if cursor is inside a comment
 * @param document
 * @param position
 */
export function isInsideComment(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  // Check for comments
  const commentPatterns = [
    /^\s*\/\/.*$/, // Single line comment (JS, TS, Java, C#, etc.)
    /^\s*#.*$/, // Python/Ruby/Shell comment
    /^\s*--.*$/, // SQL comment
    /^\s*\/\*(?!\*\/).*$/, // Start of multi-line comment
    /^\s*\*(?!\*\/).*$/, // Middle of multi-line comment
  ];

  return commentPatterns.some((pattern) => pattern.test(linePrefix));
}

/**
 * Checks if cursor is inside a control structure
 */
export function isInsideControlStructure(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  // Check for control structures
  const controlPatterns = [
    /if\s*\(.*\)\s*{?$/, // if
    /else\s*{?$/, // else
    /else\s+if\s*\(.*\)\s*{?$/, // else if
    /for\s*\(.*\)\s*{?$/, // for
    /while\s*\(.*\)\s*{?$/, // while
    /switch\s*\(.*\)\s*{?$/, // switch
    /case\s+.*:$/, // case
    /try\s*{?$/, // try block
    /catch\s*\(.*\)\s*{?$/, // catch block
    /finally\s*{?$/, // finally block
  ];

  return controlPatterns.some((pattern) => pattern.test(linePrefix));
}

/**
 * Checks if a cache should be invalidated for the current context
 * @param document
 * @param position
 */
export function shouldInvalidateCache(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentLine = document.lineAt(position.line).text;
  const linePrefix = currentLine.substring(0, position.character);

  /**
   * Invalidate cache if:
   * 1. Line already has a property.
   * 2. Line has changed
   * 3. Cursor is on a new line
   */
  return (
    linePrefix.includes(":") ||
    linePrefix.trim().length === 0 ||
    isNewPropertyLine(document, position)
  );
}

/**
 * Checks if the current line is a new property line in an object
 * @param document
 * @param position
 */
export function isNewPropertyLine(
  document: vscode.TextDocument,
  position: vscode.Position
): boolean {
  const currentLine = document.lineAt(position.line).text.trim();
  const prevLine =
    position.line > 0 ? document.lineAt(position.line - 1).text.trim() : "";

  /**
   * A new property line if:
   *    1. Previous line ends with a comma
   *    2. Current line is empty
   *    3. Cursor on a new line after a property
   **/
  return (
    prevLine.endsWith(",") ||
    currentLine === "" ||
    (prevLine.includes(":") && !currentLine.includes(":"))
  );
}
