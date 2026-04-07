// @ts-ignore
import { CocosPluginManifest, CocosPluginOptions, Panel } from "cc-plugin/src/declare";

const pkgName = "cc-inspector";

function i18n(key: string) {
  return `i18n:${pkgName}.${key}`;
}

const manifest: CocosPluginManifest = {
  name: pkgName,
  version: "2.2.0",
  description: "Debug games made with CocosCreator and display node trees and node properties",
  store: "https://store.cocos.com/app/detail/2002",
  author: "xu_yanfeng",
  main: "./src/main.ts",
  panels: [
    {
      name: "inspector",
      type: Panel.Type.DockAble,
      main: "./src/panel/index.ts",
      title: "Cocos Inspector",
      width: 500,
      height: 400,
      minWidth: 50,
      minHeight: 400,
    },
  ],
  menus: [
    {
      path: `cc-inspector/${i18n("title")}`,
      message: {
        name: "showPanel",
      },
    },
  ],
  i18n_en: "./src/i18n/en.ts",
  i18n_zh: "./src/i18n/zh.ts",
  icon: {
    "48": "./icons/48.png",
  },
  analysis: {
    // googleAnalytics: "G-0S2X4Z1FE7",
  },
  chrome: {
    // @ts-ignore - permissions not yet in type definition
    permissions: ["storage", "notifications"],
    url: "https://chromewebstore.google.com/detail/cc-inspector/hejbkamkfnkifppoaljcidepkhgaahcj?authuser=0&hl=en",
    version: 3,
    pem: "./crx-key.pem",
    view_devtools: "src/views/devtools/index.ts",
    view_options: "src/views/options/index.ts",
    view_popup: "src/views/popup/index.ts",
    script_background: "src/scripts/background/index.ts",
    script_content: "src/scripts/content/index.ts",
    script_inject: "src/scripts/inject/index.ts",
    script_inject_view: "src/scripts/inject-view/web-test.ts",
    sourceMap: true,
  },
};
const options: CocosPluginOptions = {
  // @ts-ignore
  genSourceMap: true,
  // @ts-ignore
  production: false,
  // @ts-ignore
  sourceMap: true,
  minify: false,
  // @ts-ignore
  webpack: {
    optimization: {
      minimize: false,
    },
    devtool: "source-map",
  },
  obscure: false,
  server: {
    enabled: false,
    port: 2022,
    https: true,
    writeToDisk: true,
  },
  watchBuild: true,
  outputProject: {
    web: "./web",
    chrome: "./chrome",
  },
};
export default { manifest, options };
