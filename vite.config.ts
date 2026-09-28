import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const cesiumBuild = resolve("node_modules/cesium/Build/Cesium");
const publicCesium = resolve("public/cesium");

function copyCesiumAssets() {
  return {
    name: "copy-cesium-assets",
    configResolved() {
      if (!existsSync(cesiumBuild)) return;
      mkdirSync(publicCesium, { recursive: true });
      for (const directory of ["Assets", "ThirdParty", "Widgets", "Workers"]) {
        cpSync(resolve(cesiumBuild, directory), resolve(publicCesium, directory), {
          recursive: true,
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [copyCesiumAssets()],
  define: {
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
  },
});
