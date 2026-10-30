import * as Phaser from "phaser";

/*
 * Pixel art drawn crisp at any zoom without flickering as the camera moves:
 * each art pixel is a solid block, blended only on the screen pixel at its edge.
 */

const NAME = "Crisp";

const FRAG = `#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D uMainSampler;
uniform vec2 uTexSize;

varying vec2 outTexCoord;
varying float outTintEffect;
varying vec4 outTint;

void main ()
{
    // Sharp edges when magnified, plain smooth sampling when shrunk.
    vec2 texel = outTexCoord * uTexSize;
    vec2 edge = floor(texel + 0.5);
    vec2 span = clamp(fwidth(texel), 1e-5, 1.0);
    texel = edge + clamp((texel - edge) / span, -0.5, 0.5);

    vec4 texture = texture2D(uMainSampler, texel / uTexSize);
    vec4 tint = vec4(outTint.bgr * outTint.a, outTint.a);
    vec4 color = texture * tint;

    if (outTintEffect == 1.0)
    {
        color.rgb = mix(texture.rgb, outTint.bgr * outTint.a, texture.a);
    }
    else if (outTintEffect == 2.0)
    {
        color = tint;
    }

    gl_FragColor = color;
}`;

/** One texture per draw, so the shader knows its size. */
class CrispPipeline extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline {
  constructor(game: Phaser.Game) {
    super({ game, name: NAME, fragShader: FRAG });
  }

  pushBatch(texture: Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper): number {
    if (this.currentBatch && texture !== this.currentTexture) this.flush();
    return super.pushBatch(texture);
  }

  onBeforeFlush() {
    const texture = this.batch[0]?.texture[0];
    if (texture) this.set2f("uTexSize", texture.width, texture.height);
  }
}

const ready = new WeakMap<Phaser.Game, boolean>();

/** Whether this game can draw crisp; adds the pipeline on first ask. */
export function crispReady(scene: Phaser.Scene): boolean {
  const game = scene.game;
  const known = ready.get(game);
  if (known !== undefined) return known;
  const renderer = game.renderer;
  let ok = false;
  if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer && renderer.gl.getExtension("OES_standard_derivatives")) {
    try {
      renderer.pipelines.add(NAME, new CrispPipeline(game));
      // After a lost context the extension must be back before Phaser rebuilds shaders.
      // Its own handler is removed by hand: setContextHandlers removes it from the wrong event.
      renderer.canvas.removeEventListener("webglcontextrestored", renderer.contextRestoredHandler as EventListener, false);
      renderer.setContextHandlers(undefined, function (this: Phaser.Renderer.WebGL.WebGLRenderer, event: WebGLContextEvent) {
        this.gl.getExtension("OES_standard_derivatives");
        this.dispatchContextRestored(event);
      });
      ok = true;
    } catch (error) {
      console.error("Crisp floor unavailable, drawing it smooth", error);
    }
  }
  ready.set(game, ok);
  return ok;
}

/** Draws pixel art crisp where the game can. */
export function crisp<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Pipeline>(object: T): T {
  if (crispReady(object.scene)) object.setPipeline(NAME);
  return object;
}
