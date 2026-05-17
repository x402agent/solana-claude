import React, { useState, useEffect, useRef } from "react";
import { Box, Text } from "ink";
import { useInputHandler } from "../../hooks/use-input-handler.js";
import { LoadingSpinner } from "./loading-spinner.js";
import { CommandSuggestions } from "./command-suggestions.js";
import { ModelSelection } from "./model-selection.js";
import { ChatHistory } from "./chat-history.js";
import { ChatInput } from "./chat-input.js";
import { MCPStatus } from "./mcp-status.js";
import ConfirmationDialog from "./confirmation-dialog.js";
import { ConfirmationService, } from "../../utils/confirmation-service.js";
import ApiKeyInput from "./api-key-input.js";
import cfonts from "cfonts";
// Main chat component that handles input when agent is available
function ChatInterfaceWithAgent({ agent, initialMessage, }) {
    const [chatHistory, setChatHistory] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingTime, setProcessingTime] = useState(0);
    const [tokenCount, setTokenCount] = useState(0);
    const [isStreaming, setIsStreaming] = useState(false);
    const [confirmationOptions, setConfirmationOptions] = useState(null);
    const scrollRef = useRef();
    const processingStartTime = useRef(0);
    const confirmationService = ConfirmationService.getInstance();
    const { input, cursorPosition, showCommandSuggestions, selectedCommandIndex, showModelSelection, selectedModelIndex, commandSuggestions, availableModels, autoEditEnabled, } = useInputHandler({
        agent,
        chatHistory,
        setChatHistory,
        setIsProcessing,
        setIsStreaming,
        setTokenCount,
        setProcessingTime,
        processingStartTime,
        isProcessing,
        isStreaming,
        isConfirmationActive: !!confirmationOptions,
    });
    useEffect(() => {
        // Only clear console on non-Windows platforms or if not PowerShell
        // Windows PowerShell can have issues with console.clear() causing flickering
        const isWindows = process.platform === "win32";
        const isPowerShell = process.env.ComSpec?.toLowerCase().includes("powershell") ||
            process.env.PSModulePath !== undefined;
        if (!isWindows || !isPowerShell) {
            console.clear();
        }
        // Add top padding
        console.log("    ");
        // Generate logo with margin to match Ink paddingX={2}
        const logoOutput = cfonts.render("Clawd", {
            font: "3d",
            align: "left",
            colors: ["red", "cyan"],
            space: true,
            maxLength: "0",
            gradient: ["red", "yellow"],
            independentGradient: false,
            transitionGradient: true,
            env: "node",
        });
        // Add horizontal margin (2 spaces) to match Ink paddingX={2}
        const logoLines = logoOutput.string.split("\n");
        logoLines.forEach((line) => {
            if (line.trim()) {
                console.log(" " + line); // Add 2 spaces for horizontal margin
            }
            else {
                console.log(line); // Keep empty lines as-is
            }
        });
        console.log("  🦞 Clawd Code CLI • Lobster-mode terminal for Solana operators");
        console.log(" "); // Spacing after logo
        setChatHistory([]);
    }, []);
    // Process initial message if provided (streaming for faster feedback)
    useEffect(() => {
        if (initialMessage && agent) {
            const userEntry = {
                type: "user",
                content: initialMessage,
                timestamp: new Date(),
            };
            setChatHistory([userEntry]);
            const processInitialMessage = async () => {
                setIsProcessing(true);
                setIsStreaming(true);
                try {
                    let streamingEntry = null;
                    for await (const chunk of agent.processUserMessageStream(initialMessage)) {
                        switch (chunk.type) {
                            case "content":
                                if (chunk.content) {
                                    if (!streamingEntry) {
                                        const newStreamingEntry = {
                                            type: "assistant",
                                            content: chunk.content,
                                            timestamp: new Date(),
                                            isStreaming: true,
                                        };
                                        setChatHistory((prev) => [...prev, newStreamingEntry]);
                                        streamingEntry = newStreamingEntry;
                                    }
                                    else {
                                        setChatHistory((prev) => prev.map((entry, idx) => idx === prev.length - 1 && entry.isStreaming
                                            ? { ...entry, content: entry.content + chunk.content }
                                            : entry));
                                    }
                                }
                                break;
                            case "token_count":
                                if (chunk.tokenCount !== undefined) {
                                    setTokenCount(chunk.tokenCount);
                                }
                                break;
                            case "tool_calls":
                                if (chunk.toolCalls) {
                                    // Stop streaming for the current assistant message
                                    setChatHistory((prev) => prev.map((entry) => entry.isStreaming
                                        ? {
                                            ...entry,
                                            isStreaming: false,
                                            toolCalls: chunk.toolCalls,
                                        }
                                        : entry));
                                    streamingEntry = null;
                                    // Add individual tool call entries to show tools are being executed
                                    chunk.toolCalls.forEach((toolCall) => {
                                        const toolCallEntry = {
                                            type: "tool_call",
                                            content: "Executing...",
                                            timestamp: new Date(),
                                            toolCall: toolCall,
                                        };
                                        setChatHistory((prev) => [...prev, toolCallEntry]);
                                    });
                                }
                                break;
                            case "tool_result":
                                if (chunk.toolCall && chunk.toolResult) {
                                    setChatHistory((prev) => prev.map((entry) => {
                                        if (entry.isStreaming) {
                                            return { ...entry, isStreaming: false };
                                        }
                                        if (entry.type === "tool_call" &&
                                            entry.toolCall?.id === chunk.toolCall?.id) {
                                            return {
                                                ...entry,
                                                type: "tool_result",
                                                content: chunk.toolResult.success
                                                    ? chunk.toolResult.output || "Success"
                                                    : chunk.toolResult.error || "Error occurred",
                                                toolResult: chunk.toolResult,
                                            };
                                        }
                                        return entry;
                                    }));
                                    streamingEntry = null;
                                }
                                break;
                            case "done":
                                if (streamingEntry) {
                                    setChatHistory((prev) => prev.map((entry) => entry.isStreaming ? { ...entry, isStreaming: false } : entry));
                                }
                                setIsStreaming(false);
                                break;
                        }
                    }
                }
                catch (error) {
                    const errorEntry = {
                        type: "assistant",
                        content: `Error: ${error.message}`,
                        timestamp: new Date(),
                    };
                    setChatHistory((prev) => [...prev, errorEntry]);
                    setIsStreaming(false);
                }
                setIsProcessing(false);
                processingStartTime.current = 0;
            };
            processInitialMessage();
        }
    }, [initialMessage, agent]);
    useEffect(() => {
        const handleConfirmationRequest = (options) => {
            setConfirmationOptions(options);
        };
        confirmationService.on("confirmation-requested", handleConfirmationRequest);
        return () => {
            confirmationService.off("confirmation-requested", handleConfirmationRequest);
        };
    }, [confirmationService]);
    useEffect(() => {
        if (!isProcessing && !isStreaming) {
            setProcessingTime(0);
            return;
        }
        if (processingStartTime.current === 0) {
            processingStartTime.current = Date.now();
        }
        const interval = setInterval(() => {
            setProcessingTime(Math.floor((Date.now() - processingStartTime.current) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [isProcessing, isStreaming]);
    const handleConfirmation = (dontAskAgain) => {
        confirmationService.confirmOperation(true, dontAskAgain);
        setConfirmationOptions(null);
    };
    const handleRejection = (feedback) => {
        confirmationService.rejectOperation(feedback);
        setConfirmationOptions(null);
        // Reset processing states when operation is cancelled
        setIsProcessing(false);
        setIsStreaming(false);
        setTokenCount(0);
        setProcessingTime(0);
        processingStartTime.current = 0;
    };
    return (React.createElement(Box, { flexDirection: "column", paddingX: 2 },
        chatHistory.length === 0 && !confirmationOptions && (React.createElement(Box, { flexDirection: "column", marginBottom: 2 },
            React.createElement(Text, { color: "cyan", bold: true }, "Tips for getting started:"),
            React.createElement(Box, { marginTop: 1, flexDirection: "column" },
                React.createElement(Text, { color: "gray" }, "1. Ask questions, edit files, or run commands."),
                React.createElement(Text, { color: "gray" }, "2. Be specific for the best results."),
                React.createElement(Text, { color: "gray" }, "3. Create CLAWD.md files in .clawd/ to customize interactions."),
                React.createElement(Text, { color: "gray" }, "4. Press Shift+Tab to toggle auto-edit mode."),
                React.createElement(Text, { color: "gray" }, "5. /help for more information.")))),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "gray" }, "Type your request in natural language. Ctrl+C to clear, 'exit' to quit.")),
        React.createElement(Box, { flexDirection: "column", ref: scrollRef },
            React.createElement(ChatHistory, { entries: chatHistory, isConfirmationActive: !!confirmationOptions })),
        confirmationOptions && (React.createElement(ConfirmationDialog, { operation: confirmationOptions.operation, filename: confirmationOptions.filename, showVSCodeOpen: confirmationOptions.showVSCodeOpen, content: confirmationOptions.content, onConfirm: handleConfirmation, onReject: handleRejection })),
        !confirmationOptions && (React.createElement(React.Fragment, null,
            React.createElement(LoadingSpinner, { isActive: isProcessing || isStreaming, processingTime: processingTime, tokenCount: tokenCount, model: agent.getCurrentModel() }),
            React.createElement(ChatInput, { input: input, cursorPosition: cursorPosition, isProcessing: isProcessing, isStreaming: isStreaming }),
            React.createElement(Box, { flexDirection: "row", marginTop: 1 },
                React.createElement(Box, { marginRight: 2 },
                    React.createElement(Text, { color: "cyan" },
                        autoEditEnabled ? "▶" : "⏸",
                        " auto-edit:",
                        " ",
                        autoEditEnabled ? "on" : "off"),
                    React.createElement(Text, { color: "gray", dimColor: true },
                        " ",
                        "(shift + tab)")),
                React.createElement(Box, { marginRight: 2 },
                    React.createElement(Text, { color: "yellow" },
                        "\u224B ",
                        agent.getCurrentModel())),
                React.createElement(MCPStatus, null)),
            React.createElement(CommandSuggestions, { suggestions: commandSuggestions, input: input, selectedIndex: selectedCommandIndex, isVisible: showCommandSuggestions }),
            React.createElement(ModelSelection, { models: availableModels, selectedIndex: selectedModelIndex, isVisible: showModelSelection, currentModel: agent.getCurrentModel() })))));
}
// Main component that handles API key input or chat interface
export default function ChatInterface({ agent, initialMessage, }) {
    const [currentAgent, setCurrentAgent] = useState(agent || null);
    const handleApiKeySet = (newAgent) => {
        setCurrentAgent(newAgent);
    };
    if (!currentAgent) {
        return React.createElement(ApiKeyInput, { onApiKeySet: handleApiKeySet });
    }
    return (React.createElement(ChatInterfaceWithAgent, { agent: currentAgent, initialMessage: initialMessage }));
}
//# sourceMappingURL=chat-interface.js.map