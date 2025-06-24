import * as vscode from "vscode";
import { OllamaInlineCompletionProvider } from "./OllamaInlineCompletionProvider";

export let completionProvider: OllamaInlineCompletionProvider | null = null;

export function registerInlineCompletionProvider(
  context: vscode.ExtensionContext
) {
  // Create single instance of the provider
  completionProvider = new OllamaInlineCompletionProvider();

  const provider = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: "**" },
    completionProvider
  );

  context.subscriptions.push(provider);
}
