import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const baseConfig: NextConfig = {};

export default function nextConfig(phase: string): NextConfig {
  return {
    ...baseConfig,
    // Keep dev artifacts separate from production build output to avoid stale chunk errors.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"
  };
}
