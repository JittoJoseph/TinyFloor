import { frontendConfig } from "../web-shared/next-config.mjs";

// The floor only ever loads in the browser (ssr: false, or inside an effect),
// so the server build leaves Phaser out instead of carrying 1.2MB it never
// runs; the browser build gets only the parts of it the floor uses
// (src/lib/phaser.js).
const config = frontendConfig({ serverLeavesOut: ["phaser"], browserUses: { phaser: "./src/lib/phaser.js" } });

// Phaser's source built with the switches its own build sets (phaser-switches.cjs):
// WebGL, and canvas for a browser without it; no sound, 3D camera, Facebook games or debugging.
config.turbopack!.rules = {
  "*.js": {
    condition: { path: /node_modules\/(\.pnpm\/phaser@[^/]+\/node_modules\/)?phaser\/src\// },
    loaders: [
      {
        loader: "./phaser-switches.cjs",
        options: {
          WEBGL_RENDERER: true,
          CANVAS_RENDERER: true,
          FEATURE_SOUND: false,
          PLUGIN_CAMERA3D: false,
          PLUGIN_FBINSTANT: false,
          WEBGL_DEBUG: false,
          EXPERIMENTAL: false,
          PLUGIN_3D: false,
        },
      },
    ],
  },
};

export default config;
