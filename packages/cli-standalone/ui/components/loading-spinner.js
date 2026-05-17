import React, { useState, useEffect, useMemo } from "react";
import { Box, Text } from "ink";
import { formatTokenCount } from "../../utils/token-counter.js";
import { CLAWD_SPINNERS, spinnerForProvider, } from "../clawd-spinners.js";
import { getSettingsManager } from "../../utils/settings-manager.js";
const loadingTexts = [
    "Clawing through context...",
    "Pinching tokens...",
    "Scuttling across the chain...",
    "Snapping into focus...",
    "Thinking...",
    "Computing...",
    "Analyzing...",
    "Decrypting...",
    "Synthesizing...",
    "Calibrating antennae...",
    "Boiling water...",
    "Molting tokens...",
];
export function LoadingSpinner({ isActive, processingTime, tokenCount, spinner, model, }) {
    const [spinnerFrame, setSpinnerFrame] = useState(0);
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);
    // Pick a spinner: explicit prop > provider-themed for current model > clawdSpin.
    const active = useMemo(() => {
        if (spinner && CLAWD_SPINNERS[spinner])
            return CLAWD_SPINNERS[spinner];
        try {
            const manager = getSettingsManager();
            const m = model || manager.getCurrentModel();
            const provider = manager.getProviderForModel(m);
            return spinnerForProvider(provider);
        }
        catch {
            return CLAWD_SPINNERS.clawdSpin;
        }
    }, [spinner, model]);
    useEffect(() => {
        if (!isActive)
            return;
        const interval = setInterval(() => {
            setSpinnerFrame((prev) => (prev + 1) % active.frames.length);
        }, active.interval);
        return () => clearInterval(interval);
    }, [isActive, active]);
    useEffect(() => {
        if (!isActive)
            return;
        setLoadingTextIndex(Math.floor(Math.random() * loadingTexts.length));
        const interval = setInterval(() => {
            setLoadingTextIndex(Math.floor(Math.random() * loadingTexts.length));
        }, 4000);
        return () => clearInterval(interval);
    }, [isActive]);
    if (!isActive)
        return null;
    return (React.createElement(Box, { marginTop: 1 },
        React.createElement(Text, { color: "red" },
            active.frames[spinnerFrame],
            " "),
        React.createElement(Text, { color: "cyan" },
            loadingTexts[loadingTextIndex],
            " "),
        React.createElement(Text, { color: "gray" },
            "(",
            processingTime,
            "s \u00B7 \u2191 ",
            formatTokenCount(tokenCount),
            " tokens \u00B7 esc to interrupt)")));
}
//# sourceMappingURL=loading-spinner.js.map