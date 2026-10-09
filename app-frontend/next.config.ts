import { frontendConfig } from "../web-shared/next-config.mjs";

// The floor only ever loads in the browser (ssr: false, or inside an effect),
// so the server build leaves Phaser out instead of carrying 1.2MB it never runs.
export default frontendConfig({ serverLeavesOut: ["phaser"] });
