# Sodalis 


<img src="media/sodalis-icon.png" style="width: 90px; height: 90px; float :right" />
Sodalis enhances software development by offering cutting-edge AI-powered code completion and interactive chat capabilities. Utilizing local Large Language Models (LLMs) through Ollama, Sodalis provides developers with real-time coding assistance, enabling efficient and productive workflows.

<br style="clear:right; margin-bottom: 2em;" />

**Key Features:**
- **AI-Powered Code Completion:** Automates and accelerates the coding process by providing context-aware suggestions as you type.
- **Interactive Chat Interface:** Engage in meaningful conversations about your code, allowing for dynamic debugging and problem-solving.
- **Local LLMs with Ollama:** Run AI models directly on your machine for faster response times, enhanced privacy, and customizable workflows.
- **Seamless Integration:** Compatible with popular IDEs, Sodalis fits effortlessly into your existing development environment.
- **Efficiency Boost:** Reduce repetitive tasks and focus on innovative coding with intelligent suggestions tailored to your project's context.

**Benefits:**
- **Faster Development:** Streamline your workflow with instant code suggestions and interactive chat features.
- **Enhanced Privacy:** By using local models, Sodalis ensures that your code remains secure and free from external data collection.
- **Customizable Solutions:** Tailor your AI experience to match your specific needs and preferences.

**Use Cases:**
- **Code Completion:** Automatically complete lines of code while writing software, saving time and reducing errors.
- **Interactive Debugging:** Use the chat interface to troubleshoot issues and explore different solutions dynamically.
- **Collaborative Development:** Facilitate teamwork by sharing insights and discussing code in real-time.

---
## **Getting Started:**
Elevate your coding experience with Sodalis. Whether you're a seasoned developer or just starting out, Sodalis offers tools that enhance productivity and creativity. 

Sodalis is not yet published through the Marketplace as its in active development but if you would like to install it you can pull code down and package it up, then install the vsix. 

1. Clone this repo
2. `npm i` 
3. Install the VSCode Extension Packager library `npm i -g @vscode/vsce`
4. Package this extension `vsce package`
5. Install the generated `.vsix` file manually.

![](media/Install-VSIX%20.png)

---
## Commands
With the extension installed there are several commands you can run.

On a Mac: `CMD + Shift + P` to open the VSCode Command Pallet. There you should find these commands:

- `Select Default Model` - Sets the default model for Ollama to use.
- `Search Available Models` - Search the models available with Ollama.
- `Clear Completion Cache` - Clears the code completion cache.
- `Update Ollama Host` - Update the Ollama API Host address.
- `Open Sodalis Chat Panel` - Opens the Sodalis Chat Panel.

---
## Requirements

You must have Ollama installed on your machine with at least 1 model downloaded.

For more on [Ollama](https://ollama.com/).

---
## Commands

