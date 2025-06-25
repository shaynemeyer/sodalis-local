import ollama from "ollama";
import { resolve } from "path";
import vscode from "vscode";
import { OLLAMA_DEFAULT_MODEL_KEY } from "../constants";

export interface ModelInfo {
  label: string;
  details?: string;
}

/**
 * Get the available Ollama models
 */
export async function getAvailableOllamaModels(): Promise<ModelInfo[]> {
  const maxRetries = 5;
  let retries = 0;
  let lastError = null;

  while (retries < maxRetries) {
    try {
      const response = await ollama.list();

      if (!response || !response.models || !Array.isArray(response.models)) {
        throw new Error("Response from Ollama API is not valid");
      }

      const availableModels = response.models.map((model) => {
        return {
          label: model.name,
          details: model.details
            ? `${model.details.family || ""} ${
                model.details.parameter_size || ""
              }`
            : "",
        };
      });

      return availableModels;
    } catch (error) {
      lastError = error;
      console.error(
        `Error fetching Ollama models. [Attempt: ${retries + 1}]`,
        error
      );
      retries++;

      if (retries < maxRetries) {
        // Wait 1 second before trying again.
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  const errorMessage =
    lastError instanceof Error ? lastError.message : String(lastError);
  vscode.window.showErrorMessage(
    `Failed to fetch Ollama models: ${errorMessage}`
  );

  return [];
}

/**
 * Get the selected Ollama model
 */
export async function getSelectedModel(): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration("ollama");
  const selectedModel = config.get<string>("defaultModel");

  if (selectedModel) {
    return selectedModel;
  }

  const availableModels = await getAvailableOllamaModels();

  if (availableModels.length === 0) {
    vscode.window.showWarningMessage("No models found");
    return;
  }

  const model = await vscode.window.showQuickPick(availableModels, {
    placeHolder: "Select a model",
    matchOnDetail: true,
  });

  if (model) {
    await config.update(OLLAMA_DEFAULT_MODEL_KEY, model.label, true);
    vscode.window.showInformationMessage(`Select model: ${model.label}`);
    return model.label;
  }

  return;
}

/**
 * Initializes the Ollama client and tests the connection
 */
export async function initializeOllamaClient(): Promise<boolean> {
  try {
    const config = vscode.workspace.getConfiguration("ollama");
    const apiHost = config.get<string>("apiHost") || "http://localhost:11434";

    // Log debugging information about Ollama client
    console.log("Ollama client:", ollama);
    console.log("Trying to connect to Ollama at:", apiHost);

    // Test connection by getting a list of models
    await ollama.list();
    console.log("Successfully connected to Ollama");
    return true;
  } catch (error) {
    console.error("Failed to connect to Ollama:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    vscode.window.showErrorMessage(
      `Could not connect to Ollama: ${errorMessage}. ` +
        `Make sure the Ollama server is running and accessible.`
    );
    return false;
  }
}
