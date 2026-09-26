import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";

import viteConfig from "./vite.config";

export default mergeConfig(
  typeof viteConfig === "function"
    ? viteConfig({ command: "serve", mode: "test", isSsrBuild: false })
    : viteConfig,
  defineConfig({
    test: {
      environment: "happy-dom",
      environmentOptions: {
        happyDOM: {
          url: "http://localhost/",
        },
      },
      setupFiles: ["./src/test/setup.ts"],
      restoreMocks: true,
    },
  }),
);
