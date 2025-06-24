import * as vscode from "vscode";
import ollama from "ollama";
import { LRUCache } from "../../utils/LRUCache";
import { getContextHash, getFileContext } from "./helpers";
import { generatePrompt } from "./generators/promptGenerators";
import { cleanAIResponse } from "../cleaners/ollamaResponseCleaner";

export class OllamaInlineCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private currentResponse: { abort: () => void } | null = null;
  private debounceTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 200; // in milliseconds
  private readonly completionCache: LRUCache<
    string,
    { completion: string; timestamp: number }
  >;
  private readonly CACH_SIZE = 100;
  private readonly CACHE_TTL = 5 * 60 * 100; // 5 minutes
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.completionCache = new LRUCache(this.CACH_SIZE);
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    if (this.currentResponse) {
      this.currentResponse.abort();
    }
  }

  public clearCache(): void {
    this.completionCache.clear();
    vscode.window.showInformationMessage("Completion cache cleared");
  }

  private generateCacheKey(
    document: vscode.TextDocument,
    position: vscode.Position
  ): string {
    const linePrefix = document
      .lineAt(position.line)
      .text.substring(0, position.character);
    const contextHash = getContextHash(document, position);
    return `${contextHash}:${linePrefix}:${position.line}:${position.character}`;
  }

  private async generateCompletion(
    prompt: string,
    model: string,
    token: vscode.CancellationToken
  ): Promise<string> {
    const request = {
      model,
      stream: true as const,
      messages: [
        {
          role: "system",
          content:
            "You are a code completion assistant like Github Copilot. RETURN ONY THE RAW CODE COMPLETION. NO <THINK> BLOCKS, NO EXPLANTATIONS, NO COMMENTS, NO MARKDOWN, NO PROSE. JUST THE EXACT CODE TO INSERT AT THE CURSOR.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    };

    let fullResponse = "";

    try {
      const response = await ollama.chat(request);
      this.currentResponse = response;

      for await (const part of response) {
        if (token.isCancellationRequested) {
          console.log("Request aborted during streaming");
          this.currentResponse.abort();
          this.currentResponse = null;

          return fullResponse;
        }
        if (part.message?.content) {
          fullResponse += part.message.content;
        }
      }

      return fullResponse;
    } finally {
      this.currentResponse = null;
    }
  }

  provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<
    vscode.InlineCompletionItem[] | vscode.InlineCompletionList
  > {
    const linePrefix = document
      .lineAt(position.line)
      .text.substring(0, position.character);

    // Generate cache key based on context
    const cacheKey = this.generateCacheKey(document, position);

    // Check cache first
    const cached = this.completionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return [
        new vscode.InlineCompletionItem(
          cached.completion,
          new vscode.Range(position, position)
        ),
      ];
    }

    // Cancel any pending requests
    if (this.currentResponse) {
      this.currentResponse.abort();
      this.currentResponse = null;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    return new Promise((resolve) => {
      this.debounceTimeout = setTimeout(async () => {
        try {
          const config = vscode.workspace.getConfiguration("ollama");
          const model = config.get<string>("defaultModel");
          if (!model) {
            vscode.window.showWarningMessage("No Ollama model selected.");
            resolve(undefined);
            return;
          }

          const fileContext = getFileContext(document, position);
          // console.log("File context:", fileContext);
          const prompt = generatePrompt(fileContext, document, position);
          console.log("Prompt:", prompt);

          const completion = await this.generateCompletion(
            prompt,
            model,
            token
          );

          if (token.isCancellationRequested) {
            console.log("Request cancelled!");
            resolve(undefined);
            return;
          }

          const cleanedCompletion = cleanAIResponse(
            completion,
            document,
            position
          );
          console.log("Cleaned response:", cleanedCompletion);

          if (!cleanedCompletion) {
            console.log("No valid cleaned completion");
            resolve(undefined);
            return;
          }

          this.completionCache.set(cacheKey, {
            completion: cleanedCompletion,
            timestamp: Date.now(),
          });

          const item = new vscode.InlineCompletionItem(
            cleanedCompletion,
            new vscode.Range(position, position)
          );
          console.log("Returning completion item:", JSON.stringify(item));
          resolve([item]);
        } catch (error) {
          console.error("Error in provideInlineCompletionItems:", error);
          resolve(undefined);
        }
      }, this.DEBOUNCE_DELAY);
    });
  }
}
