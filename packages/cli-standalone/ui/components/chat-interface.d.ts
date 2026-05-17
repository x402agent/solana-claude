import React from "react";
import { GrokAgent } from "../../agent/grok-agent.js";
interface ChatInterfaceProps {
    agent?: GrokAgent;
    initialMessage?: string;
}
export default function ChatInterface({ agent, initialMessage, }: ChatInterfaceProps): React.JSX.Element;
export {};
