// A loader for Phaser's own source (next.config.ts): it reads a few switches
// as `typeof NAME` (WEBGL_RENDERER, FEATURE_SOUND and the rest), which its own
// build replaces with true or false. This does the same, so what's switched
// off is left out of the bundle rather than carried and never run.
module.exports = function phaserSwitches(source) {
  const switches = this.getOptions();
  return source.replace(/typeof ([A-Z][A-Z0-9_]+)\b/g, (found, name) => (name in switches ? String(switches[name]) : found));
};
