import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clawd: {
          purple: "#9945FF",
          green: "#14F195",
          bg: "#0a0a0f",
          surface: "#12121a",
          border: "#1e1e2e",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
