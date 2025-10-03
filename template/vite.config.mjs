import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { readFileSync } from "fs";
import VueRouter from "unplugin-vue-router/vite";
import { VueRouterAutoImports } from "unplugin-vue-router";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import * as dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { PrimeVueResolver } from "@primevue/auto-import-resolver";
import { cloudflare } from "@cloudflare/vite-plugin";

const { parsed: exposedEnvs } = dotenvExpand.expand({
  ...dotenv.config({
    override: false,
    path: ".env",
  }),
  ignoreProcessEnv: true,
});
const envKeys = Object.fromEntries(
  Object.entries(exposedEnvs).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])
);
// console.log({ envKeys });
const env = process.env;
const AsFileName = (arg) => {
  return arg.value.rawSegment;
};
const plugins = [
  nodePolyfills({
    // To add only specific polyfills, add them here. If no option is passed, adds all polyfills
    // include: ["path"],
    // To exclude specific polyfills, add them to this list. Note: if include is provided, this has no effect
    exclude: [
      "http", // Excludes the polyfill for `http` and `node:http`.
    ],
    // Whether to polyfill specific globals.
    globals: {
      Buffer: true, // can also be 'build', 'dev', or false
      global: true,
      process: true,
    },
    // Override the default polyfills for specific modules.
    overrides: {
      // Since `fs` is not supported in browsers, we can use the `memfs` package to polyfill it.
      // fs: "memfs",
    },
    // Whether to polyfill `node:` protocol imports.
    protocolImports: true,
  }),
  // https://github.com/unplugin/unplugin-vue-components?tab=readme-ov-file#configuration
  Components({
    dirs: ["./components", "./src/components"],
    extensions: ["vue"],
    dts: "./src/unplugin/components.d.ts",
    directoryAsNamespace: true,
    resolvers: [PrimeVueResolver()],
  }),
  // https://uvr.esm.is/guide/configuration.html
  // https://uvr.esm.is/introduction.html#from-scratch
  VueRouter({
    routesFolder: ["./src/views"],
    // allowed extensions to be considered as routes
    extensions: [".vue"],
    // list of glob files to exclude from the routes generation
    // e.g. ['**/__*'] will exclude all files starting with `__`
    // e.g. ['**/__*/**/*'] will exclude all files within folders starting with `__`
    exclude: [],
    dts: "./src/unplugin/typed-router.d.ts",
    getRouteName: AsFileName,
    routeBlockLang: "json5",
    importMode: env.NODE_ENV === "production" ? "sync" : "async",
  }),
  vue(),
  vueJsx(),
  // https://github.com/unplugin/unplugin-auto-import?tab=readme-ov-file#configuration
  AutoImport({
    defaultExportByFilename: true,
    eslintrc: {
      enabled: true, // Default `false`
      filepath: "./src/unplugin/.eslintrc-auto-import.json", // Default `./.eslintrc-auto-import.json`
      globalsPropValue: true, // Default `true`, (true | false | 'readonly' | 'readable' | 'writable' | 'writeable')
    },
    imports: ["vue", VueRouterAutoImports, { "vue-router/auto": ["useLink"] }, "@vueuse/core"],
    dts: "./src/unplugin/auto-imports.d.ts",
    vueTemplate: true,
    include: [
      /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      /\.vue$/,
      /\.vue\?vue/, // .vue
    ],
    dirs: [
      "./components", // only root modules
      "./composables", // only root modules
      "./globals",
      "./src/components", // only root modules
      "./src/composables", // only root modules
      "./src/globals",
    ],
  }),
  // https://docs.sheetjs.com/docs/demos/static/vitejs
  {
    // this plugin handles ?b64 tags
    name: "vite-b64-plugin",
    transform(code, id) {
      if (!id.match(/\?b64$/)) return;
      // console.log(id, code);
      const path = id.replace(/\?b64/, "");
      const data = readFileSync(path, "base64");
      return `export default '${data}'`;
    },
  },
  {
    // https://stackoverflow.com/questions/21797299/convert-base64-string-to-arraybuffer
    name: "vite-office-plugin",
    transform(code, id) {
      if (!id.match(/\.(xlsx|docx|zip)$/)) return;
      const path = id;
      const data = readFileSync(path, "base64");
      return `export default Uint8Array.from(atob('${data}'), (c) => c.charCodeAt(0))`;
    },
  },
  cloudflare(),
];
// https://vitejs.dev/config/
export default defineConfig({
  plugins,
  base: "./",
  define: envKeys,
  build: {
    minify: true,
    rollupOptions: {
      plugins: [],
    },
  },
  // server: {
  //   proxy: {
  //     "/plugins": {
  //       target: "http://localhost:8787",
  //       changeOrigin: true,
  //     },
  //     "/review": {
  //       target: "http://localhost:8787",
  //       changeOrigin: true,
  //     },
  //     "/users": {
  //       target: "http://localhost:8787",
  //       changeOrigin: true,
  //     },
  //   },
  // },
  assetsInclude: ["**/*.xlsx", "**/*.docx"],
  optimizeDeps: {
    include: ["vue"],
  },
  resolve: {
    alias: {
      "~/": fileURLToPath(new URL("./", import.meta.url)) + "/",
      "@/": fileURLToPath(new URL("./src", import.meta.url)) + "/",
    },
  },
  css: {```````
    preprocessorOptions: {
      less: {`
        javascriptEnabled: true,
      },
    },
  },`````
});
