import * as vscode from "vscode";

/**
 * Functions for detecting frameworks
 */

/**
 * Gets the framework context based on content of the document
 * @param document
 * @param position
 * @param language
 * @returns
 */
export function getFrameworkContext(
  document: vscode.TextDocument,
  position: vscode.Position,
  language: string
): string {
  const text = document.getText();

  // React
  if (
    text.includes("import React") ||
    text.includes('from "react"') ||
    text.includes("from 'react'")
  ) {
    return "Consider React patterns and practices.";
  }

  // Vue
  if (
    text.includes("import Vue") ||
    text.includes("<template>") ||
    document.fileName.endsWith(".vue")
  ) {
    return "Consider Vue.js patterns and practices.";
  }

  // Angular
  if (
    text.includes("@Component") ||
    text.includes("@NgModule") ||
    text.includes('from "@angular/core"')
  ) {
    return "Consider Angular patterns and practices.";
  }

  // Express detection
  if (
    text.includes("express()") ||
    text.includes('require("express")') ||
    text.includes("require('express')")
  ) {
    return "Consider Express.js patterns and practices.";
  }

  // Django
  if (
    (language === "python" && text.includes("from django")) ||
    text.includes("django.") ||
    text.includes("@login_required")
  ) {
    return "Consider Django patterns and practices.";
  }

  // not able to detect a framework
  return "";
}
