import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { readFileSync } from "fs";

import basicSsl from "@vitejs/plugin-basic-ssl";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "./");
  const address = env.VITE_PROXY_ADDRESS ?? "localhost";
  const port = env.VITE_PROXY_PORT ?? "6443";
  const dev_host = env.VITE_DEV_HOST ?? "0.0.0.0";
  const useHttps = mode !== "test" && env.VITE_DEV_HTTPS !== "false";

  return {
    base: "./",
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [...(useHttps ? [basicSsl()] : []), tailwindcss(), react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
        "@landscape-router/types": path.resolve(
          import.meta.dirname,
          "../landscape-types/src",
        ),
      },
    },
    build: {
      chunkSizeWarningLimit: 5000,
    },
    server: {
      host: dev_host,
      proxy: {
        "/api": {
          target: `https://${address}:${port}`,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy: any, options: any) => {
            // proxy will be an instance of 'http-proxy'
          },
        },
        "/ws": {
          target: `ws://${address}:${port}`,
          changeOrigin: true,
          ws: true,
          rewrite: (path: any) => path.replace(/^\/ws/, ""),
        },
      },
    },
  };
});
