import React from "react";
import { GrokAgent } from "../../agent/grok-agent.js";
interface ApiKeyInputProps {
    onApiKeySet: (agent: GrokAgent) => void;
}
export default function ApiKeyInput({ onApiKeySet }: ApiKeyInputProps): React.JSX.Element;
export {};
