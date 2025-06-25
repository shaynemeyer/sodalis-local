import * as vscode from "vscode";
import * as path from "path";
import { ChatMessageHandler } from "./ChatMessageHandler";
import {
  getAvailableOllamaModels,
  initializeOllamaClient,
} from "../utils/model/helpers";
import { getNonce } from "../utils/nonce";

/**
 * Manages the chat view in the sidebar
 */
export class SidebarChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "sodalisChatView";
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _messageHandler: ChatMessageHandler;
  private _selectedModel: string = "";

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this._messageHandler = new ChatMessageHandler();
  }

  /**
   * Resolves the webview view
   * @param webviewView
   * @param context
   * @param token
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): Thenable<void> | void {
    this._view = webviewView;

    // Set options for the webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "media")],
    };

    // Set the HTML content
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Initialize the default model after the webview is ready
    this._initializeDefaultModel().catch((error) => {
      console.error("Error initialing default model:", error);
      this._showErrorMessage(
        `Failed to initialize models: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });

    // Handle message from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this._handleMessage(message);
    });
  }

  /**
   * Initializes default model
   */
  private async _initializeDefaultModel() {
    try {
      const connected = await initializeOllamaClient();
      if (!connected) {
        this._showErrorMessage(
          "Could not connect to Ollama server. Please ensure it is running."
        );
        return;
      }

      const config = vscode.workspace.getConfiguration("ollama");
      const defaultModel = config.get<string>("defaultModel");

      if (defaultModel) {
        this._selectedModel = defaultModel;
        await this._sendModelInfoToWebview();
      } else {
        const models = await getAvailableOllamaModels();
        if (models.length > 0) {
          this._selectedModel = models[0].label;
          await this._sendModelInfoToWebview();
        } else {
          this._showErrorMessage(
            "No models found. please ensure Ollama has at least one model installed."
          );
        }
      }
    } catch (error) {
      console.error("Error in _initializeDefaultModel:", error);
      this._showErrorMessage(
        `Failed to initialize models: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Handles messages from the webview
   */
  private async _handleMessage(message: any) {
    if (!this._view) {
      return;
    }

    switch (message.type) {
      case "sendMessage":
        await this._handleChatMessage(
          message.text,
          message.contextFiles,
          message.useWorkspace
        );
        break;
      case "selectModel":
        this._selectedModel = message.model;
        await this._sendModelInfoToWebview();
        break;
      case "addFileContext":
        await this._handleAddFileContext();
        break;
      case "selectCodeForContext":
        await this._handleSelectCodeForContext();
        break;
      case "newChat":
        await this._handleNewChat();
        break;
    }
  }

  /**
   * Sends model info to the webview
   */
  private async _sendModelInfoToWebview() {
    if (!this._view) {
      return;
    }

    const models = await getAvailableOllamaModels();

    this._view.webview.postMessage({
      type: "updateModelInfo",
      models: models,
      selectedModel: this._selectedModel,
    });
  }

  /**
   * Handles a chat message
   */
  private async _handleChatMessage(
    text: string,
    contextFiles: string[],
    useWorkspace: boolean
  ) {
    if (!this._view) {
      return;
    }

    if (!this._selectedModel) {
      this._showErrorMessage("No model selected. Please select a model first.");
      return;
    }

    // Add the user message to the chat
    this._view.webview.postMessage({
      type: "addMessage",
      role: "user",
      content: text,
    });

    try {
      // Show loading indicator
      this._view.webview.postMessage({ type: "setLoading", loading: true });

      // Process the message
      const response = await this._messageHandler.processMessage(
        text,
        this._selectedModel,
        contextFiles,
        useWorkspace
      );

      this._view.webview.postMessage({ type: "setLoading", loading: false });

      // Then add the assistant's response to the chat
      this._view.webview.postMessage({
        type: "addMessage",
        role: "assistant",
        content: response,
      });
    } catch (error) {
      console.error("Error processing message:", error);
      this._showErrorMessage(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      // Ensure loading indicator is hidden on error
      this._view.webview.postMessage({
        type: "setLoading",
        loading: false,
      });
    }
  }

  /**
   * Handles adding file context
   */
  private async _handleAddFileContext() {
    if (!this._view) {
      return;
    }

    const files = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: "Add to Context",
      filters: {
        "All Files": ["*"],
      },
    });

    if (files && files.length > 0) {
      const contextFiles = files.map((file) => file.fsPath);
      this._view.webview.postMessage({
        type: "updateContextFiles",
        files: contextFiles,
      });
    }
  }

  /**
   * Handles selecting code for the context
   */
  private async _handleSelectCodeForContext() {
    if (!this._view) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this._showErrorMessage("No active editor to select code from");
      return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      this._showErrorMessage("No code selected");
      return;
    }

    const selectedText = editor.document.getText(selection);
    const fileName = editor.document.fileName;

    this._view.webview.postMessage({
      type: "addCodeSelection",
      code: selectedText,
      fileName: path.basename(fileName),
    });
  }

  /**
   * Handles starting a new chat
   */
  private async _handleNewChat() {
    if (!this._view) {
      return;
    }

    // Clear the chat messages
    this._view.webview.postMessage({
      type: "clearChat",
    });

    // Reset the message handler
    this._messageHandler = new ChatMessageHandler();
  }

  /**
   * Shows an error message
   */
  private _showErrorMessage(message: string) {
    vscode.window.showErrorMessage(`Sodalis Chat: ${message}`);
    if (this._view) {
      this._view?.webview.postMessage({
        type: "showError",
        message,
      });
    }
  }

  /**
   * Returns HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview) {
    // Local path to script & css for the web preview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "chat.js")
    );

    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "chat.css")
    );

    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Sodalis Chat</title>
</head>
<body>
    <div class="container sidebar-container">
        <div class="header">
            <div class="model-selector">
                <label for="model-select">Model:</label>
                <select id="model-select"></select>
            </div>
        </div>
        
        <div class="context-controls">
            <button id="add-file-btn" title="Add File Context">📎</button>
            <button id="select-code-btn" title="Use Selected Code">📄</button>
            <button id="new-chat-btn" title="Start New Chat">🔄</button>
            <label for="use-workspace" title="Search workspace">
                <input type="checkbox" id="use-workspace" />
                @workspace
            </label>
        </div>
        
        <div class="context-files">
            <h4>Context Files:</h4>
            <ul id="context-files-list"></ul>
        </div>
        
        <div class="chat-container">
            <div id="chat-messages"></div>
            
            <div class="input-container">
                <textarea id="message-input" placeholder="Ask a question about your code..."></textarea>
                <button id="send-button">Send</button>
            </div>
        </div>
    </div>
    
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
