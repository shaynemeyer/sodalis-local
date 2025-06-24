// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { EXTENSION_NAME, OLLAMA_DEFAULT_MODEL_KEY } from "./utils/constants";
import {
  getAvailableOllamaModels,
  getSelectedModel,
} from "./utils/model/helpers";
import {
  completionProvider,
  registerInlineCompletionProvider,
} from "./providers/inlineCompletionProvider";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration();
  let selectedModel = config.get<string>(OLLAMA_DEFAULT_MODEL_KEY);

  if (!selectedModel) {
    await getSelectedModel();
  }

  registerInlineCompletionProvider(context);

  // Register the command to select default model
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.selectDefaultModel`,
      async () => {
        const models = await getAvailableOllamaModels();
        const selectedModel = await vscode.window.showQuickPick(models, {
          placeHolder: "Select a model",
          matchOnDetail: true,
          matchOnDescription: true,
        });

        if (selectedModel) {
          await vscode.workspace
            .getConfiguration()
            .update(OLLAMA_DEFAULT_MODEL_KEY, selectedModel.label, true);
          vscode.window.showInformationMessage(
            `Default model set to ${selectedModel.label}`
          );
        }
      }
    )
  );

  // Register the command to clear the completion cache
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.clearCompletionCache`,
      () => {
        if (completionProvider) {
          completionProvider.clearCache();
        } else {
          vscode.window.showWarningMessage(
            "Completion provider not initialized."
          );
        }
      }
    )
  );

  // Register the command to search available models
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.searchAvailableModels`,
      async () => {
        const availableModels = await getAvailableOllamaModels();

        if (availableModels.length === 0) {
          vscode.window.showInformationMessage("No Ollama models found");
          return;
        }

        const modelList = availableModels
          .map((model) => {
            return `${model.label}${model.details} ?  (${model.details}) : "")`;
          })
          .join("\n");

        vscode.window.showInformationMessage(
          `Available models: \n${modelList}`
        );
      }
    )
  );

  // Register command to update the Ollama host
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${EXTENSION_NAME}.updateOllamaHost`,
      async () => {
        const host = await vscode.window.showInputBox({
          prompt: "Enter the new Ollama API host URL",
          validateInput: (value) => {
            try {
              new URL(value);
              return null;
            } catch (error) {
              return "Invalid URL";
            }
          },
        });

        if (host) {
          config.update("ollama.apiHost", host, true);
          vscode.window.showInformationMessage(
            "Ollama host updated successfully"
          );
        }
      }
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (completionProvider) {
    completionProvider.dispose();
  }
}
