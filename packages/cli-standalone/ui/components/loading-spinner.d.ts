import React from "react";
import { type ClawdSpinnerName } from "../clawd-spinners.js";
interface LoadingSpinnerProps {
    isActive: boolean;
    processingTime: number;
    tokenCount: number;
    /** Optional override for which Clawd spinner to play. */
    spinner?: ClawdSpinnerName;
    /** Optional override for the active model so we can pick a provider-themed spinner. */
    model?: string;
}
export declare function LoadingSpinner({ isActive, processingTime, tokenCount, spinner, model, }: LoadingSpinnerProps): React.JSX.Element;
export {};
