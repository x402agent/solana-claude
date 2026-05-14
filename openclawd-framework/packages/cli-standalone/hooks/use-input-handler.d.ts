import { GrokAgent, ChatEntry } from "../agent/grok-agent.js";
interface UseInputHandlerProps {
    agent: GrokAgent;
    chatHistory: ChatEntry[];
    setChatHistory: React.Dispatch<React.SetStateAction<ChatEntry[]>>;
    setIsProcessing: (processing: boolean) => void;
    setIsStreaming: (streaming: boolean) => void;
    setTokenCount: (count: number) => void;
    setProcessingTime: (time: number) => void;
    processingStartTime: React.MutableRefObject<number>;
    isProcessing: boolean;
    isStreaming: boolean;
    isConfirmationActive?: boolean;
}
interface CommandSuggestion {
    command: string;
    description: string;
}
interface ModelOption {
    model: string;
}
export declare function useInputHandler({ agent, chatHistory, setChatHistory, setIsProcessing, setIsStreaming, setTokenCount, setProcessingTime, processingStartTime, isProcessing, isStreaming, isConfirmationActive, }: UseInputHandlerProps): {
    input: string;
    cursorPosition: number;
    showCommandSuggestions: boolean;
    selectedCommandIndex: number;
    showModelSelection: boolean;
    selectedModelIndex: number;
    commandSuggestions: CommandSuggestion[];
    availableModels: ModelOption[];
    agent: GrokAgent;
    autoEditEnabled: boolean;
};
export {};
