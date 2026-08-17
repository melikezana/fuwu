import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: [
    "../.storybook/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)",
  ],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  async viteFinal(config) {
    const existingAliases = Array.isArray(config.resolve?.alias)
      ? config.resolve.alias
      : Object.entries(config.resolve?.alias ?? {}).map(([find, replacement]) => ({
          find,
          replacement,
        }));

    return {
      ...config,
      build: {
        ...config.build,
        chunkSizeWarningLimit: 1600,
        rollupOptions: {
          ...config.build?.rollupOptions,
          onwarn(warning, warn) {
            if (
              warning.code === "MODULE_LEVEL_DIRECTIVE" &&
              warning.message.includes("use client")
            ) {
              return;
            }

            if (warning.code === "SOURCEMAP_ERROR") {
              return;
            }

            warn(warning);
          },
        },
      },
      resolve: {
        ...config.resolve,
        alias: [
          ...existingAliases,
          {
            find: "@/lib/supabase/client",
            replacement: path.resolve(dirname, "mocks/supabase-client.ts"),
          },
          {
            find: "@/services/messaging",
            replacement: path.resolve(dirname, "mocks/messaging.ts"),
          },
        ],
      },
    };
  },
};
export default config;
