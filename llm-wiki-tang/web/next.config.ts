import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const isNetlify = process.env.NETLIFY === "true";

const nextConfig: NextConfig = {
  ...(!isNetlify && { output: "standalone" }),
  outputFileTracingRoot: path.join(__dirname),
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
