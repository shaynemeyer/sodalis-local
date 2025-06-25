import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import ollama from "ollama";
import { EventEmitter } from "events";

/**
 * Handles chat messages and generates responses from Ollama
 */
export class ChatMessageHandler {
  private readonly _messageHistory: {
    role: "user" | "assistant" | "system";
    content: string;
  }[] = [];

  // Event emitter for streaming responses
  private _streamEmitter = new EventEmitter();

  // Flag to track if generation should be stopped
  private _stopGeneration = false;

  constructor() {
    // Add a system message to start the conversation
    this._messageHistory.push({
      role: "system",
      content:
        "You are a helpful assistant specializing in coding and software development, Analyze code, answer quesitons, and provide suggestions to help the user with their programming tasks.",
    });
  }

  /**
   *
   * @param callback Adds an event listener for streaming
   * @returns
   */
  public onStream(callback: (content: string) => void): {
    dispose: () => void;
  } {
    this._streamEmitter.on("stream", callback);

    return {
      dispose: () => {
        this._streamEmitter.removeListener("stream", callback);
      },
    };
  }

  /**
   * Adds an event listener for when streaming is complete
   */
  public onStreamComplete(callback: (fullContent: string) => void): {
    dispose: () => void;
  } {
    this._streamEmitter.on("streamComplete", callback);

    return {
      dispose: () => {
        this._streamEmitter.removeListener("streamComplete", callback);
      },
    };
  }

  /**
   * Stops the current generation
   */
  public stopGeneration(): void {
    console.log("Stopping generation");
    this._stopGeneration = true;

    // Emit special event to signal generation was stopped by user.
    this._streamEmitter.emit("streamComplete", "Generation stopped by user.");
  }
  
  /**
   * Process a user message and return a response
   */
  public async processMessage(
    message: string,
    model: string,
    contextFiles: string[] = [],
    useWorkspace: boolean = false
  ): Promise<string> {
    try {
      let contextContent = "";

      if (contextFiles.length > 0) {
        contextContent += "Here are the files you requested for context:\n\n";

        for (const filePath of contextFiles) {
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            const fileName = path.basename(filePath);

            contextContent += `--- ${fileName} ---\n${content}\n\n`;
          } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
          }
        }
      }

      // Add workspace context if requested
      if (
        useWorkspace &&
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        contextContent += await this._getWorkspaceContext();
      }

      // Create the enhanced message
      let enhancedMessage = message;
      if (contextContent) {
        enhancedMessage = `${contextContent}\n\nMy question or request about this code is: ${message}`;
      }

      // Add to message history
      this._messageHistory.push({
        role: "user",
        content: enhancedMessage,
      });

      // Get response from Ollama
      const response = await this._getOllamaResponse(model);

      // Add response to history
      this._messageHistory.push({
        role: "assistant",
        content: response,
      });

      return response;
    } catch (error) {
      console.error("Error processing message", error);
      throw error;
    }
  }

  /**
   * Gets context information about the workspace
   */
  private async _getWorkspaceContext(): Promise<string> {
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      return "";
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let contextInfo = `Workspace information from ${path.basename(
      workspaceRoot
    )}:\n\n`;

    try {
      // Get active editor content if available
      if (vscode.window.activeTextEditor) {
        const document = vscode.window.activeTextEditor.document;
        const fileName = path.basename(document.fileName);

        contextInfo += `Current file (${fileName}):\n${document.getText()}\n\n`;
      }

      // Get key project files if they exist
      const keyFiles = ["package.json", "tsconfig.json", "README.md"];

      for (const file of keyFiles) {
        const filePath = path.join(workspaceRoot, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          contextInfo += `--- ${file} ---\n${content}\n\n`;
        }
      }

      // Get directory structure (limit depth for performance)
      contextInfo += "Directory structure:\n";
      contextInfo += await this._getDirectoryStructure(workspaceRoot, 2);
      return contextInfo;
    } catch (error) {
      console.error("Error getting workspace context", error);
      return "Error reading workspace context";
    }
  }

  /**
   * Gets a simple directory structure represenation
   */
  private async _getDirectoryStructure(
    dir: string,
    maxDepth: number,
    currentDepth: number = 0
  ): Promise<string> {
    if (currentDepth > maxDepth) {
      return "...\n";
    }

    try {
      let result = "";
      const indent = " ".repeat(currentDepth);
      const items = fs.readdirSync(dir);

      for (const item of items) {
        // Skip node_modules, .git and other common large directories
        if (["node_modules", ".git", "dist", "build", "out"].includes(item)) {
          result += `${indent}${item}/ (skipped)\n`;
          continue;
        }

        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          result += `${indent}${item}/\n`;
          result += await this._getDirectoryStructure(
            itemPath,
            maxDepth,
            currentDepth + 1
          );
        } else {
          result += `${indent}${item}/\n`;
        }
      }

      return result;
    } catch (error) {
      console.error("Error getting directory structure:", error);
      return `${dir} (error reading directory)\n`;
    }
  }

  /**
   * Gets a response from Ollama
   */
  private async _getOllamaResponse(model: string): Promise<string> {
    try {
      // Reset stop flag
      this._stopGeneration = false;

      // Limit the number of messages to prevent token limits
      const messageHistoryLimit = 10;
      const limitedHistory = this._messageHistory.slice(-messageHistoryLimit);

      let fullResponse = "";
      console.log(`Starting Ollama response streaming with model: ${model}`);

      // Use streaming API
      const stream = await ollama.chat({
        model,
        messages: limitedHistory,
        stream: true,
      });

      for await (const chunk of stream) {
        // Check if generation should be stopped
        if (this._stopGeneration) {
          console.log("Generation stopped by user flag");
          // Add a note to the response
          fullResponse += "\n\n[Generation stopped by user]";
          break;
        }

        const content = chunk.message.content;
        if (content) {
          fullResponse += content;
          // Emit the current complete response
          console.log(
            `Emitting stream event, response length: ${fullResponse.length}`
          );
          this._streamEmitter.emit("stream", fullResponse);
        }
      }

      // Emit stream complete event
      console.log(
        `Stream complete, final response length: ${fullResponse.length}`
      );
      this._streamEmitter.emit("streamComplete", fullResponse);

      return fullResponse;
    } catch (error) {
      console.error("Error getting Ollama response:", error);
      throw new Error(
        `Failed to get response from Ollama: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
