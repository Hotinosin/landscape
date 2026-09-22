import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { readFileSync } from "fs";

import basicSsl from "@vitejs/plugin-basic-ssl";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { NaiveUiResolver } from "unplugin-vue-components/resolvers";

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
    plugins: [
      ...(useHttps ? [basicSsl()] : []),
      vue(),
      AutoImport({
        imports: [
          "vue",
          {
            "naive-ui": [
              "useDialog",
              "useMessage",
              "useNotification",
              "useLoadingBar",
            ],
          },
        ],
      }),
      Components({
        resolvers: [NaiveUiResolver()],
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@landscape-router/types": path.resolve(
          __dirname,
          "../landscape-types/src",
        ),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            if (id.includes("node_modules")) {
              if (
                id.includes("echarts") ||
                id.includes("zrender") ||
                id.includes("vue-echarts")
              ) {
                return "vendor-echarts";
              }
              if (id.includes("@xterm")) {
                return "vendor-xterm";
              }
              if (id.includes("@vue-flow")) {
                return "vendor-vueflow";
              }
            }
          },
        },
      },
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
    preview: {
      host: dev_host,
      proxy: {
        "/api": {
          target: `https://${address}:${port}`,
          changeOrigin: true,
          secure: false,
          ws: true,
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
