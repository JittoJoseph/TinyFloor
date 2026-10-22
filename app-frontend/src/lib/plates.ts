import * as Phaser from "phaser";

/**
 * The floor's labels (name tags, desk chips, hints) are HTML laid over its
 * canvas rather than drawn into it: the canvas draws one pixel per CSS pixel,
 * so on a high-density screen anything in it is scaled up and soft, while
 * HTML text stays sharp, in the app's own type. Each label keeps a Phaser
 * object as its place in the room; this layer follows those objects.
 */
interface Item {
  object: Phaser.GameObjects.Container;
  element: HTMLElement;
  /**
   * Where the label hangs from its point: its centre, the middle of its bottom
   * edge (a name tag over a head), or of its top edge (a desk's claim chip under a chair, which grows downward).
   */
  anchor: "center" | "bottom" | "top";
  /** What was last written, so a label that hasn't moved costs no style change. */
  last: string;
}

const matrix = new Phaser.GameObjects.Components.TransformMatrix();

/**
 * The HTML labels over one floor, each kept on the game object it belongs to:
 * placed after the camera has drawn, so a label moves in the same frame as its
 * character, and hidden or faded with it.
 */
class PlateLayer {
  private readonly root: HTMLDivElement;
  private readonly items = new Set<Item>();

  constructor(private readonly scene: Phaser.Scene) {
    this.root = document.createElement("div");
    this.root.className = "plates";
    scene.game.canvas.parentElement?.appendChild(this.root);
    const camera = scene.cameras.main;
    camera.on(Phaser.Cameras.Scene2D.Events.POST_RENDER, this.sync, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      camera.off(Phaser.Cameras.Scene2D.Events.POST_RENDER, this.sync, this);
      this.root.remove();
      layers.delete(scene);
    });
  }

  add(object: Phaser.GameObjects.Container, element: HTMLElement, anchor: Item["anchor"] = "center") {
    const item: Item = { object, element, anchor, last: "" };
    this.items.add(item);
    this.root.appendChild(element);
    return () => {
      this.items.delete(item);
      element.remove();
    };
  }

  private sync() {
    const camera = this.scene.cameras.main;
    const canvas = this.scene.game.canvas;
    const ratio = canvas.clientWidth / (canvas.width || 1);
    const view = camera.worldView;
    for (const item of this.items) {
      const { object, element, anchor } = item;
      let alpha = 1;
      for (let node: Phaser.GameObjects.Container | null = object; node; node = node.parentContainer) {
        if (!node.visible) {
          alpha = 0;
          break;
        }
        alpha *= node.alpha;
      }
      if (alpha <= 0.01) {
        if (item.last !== "none") element.style.display = "none";
        item.last = "none";
        continue;
      }
      object.getWorldTransformMatrix(matrix);
      const x = ((matrix.tx - view.x) * camera.zoom + camera.x) * ratio;
      const y = ((matrix.ty - view.y) * camera.zoom + camera.y) * ratio;
      const scale = Math.hypot(matrix.a, matrix.b) * camera.zoom * ratio;
      const lift = anchor === "bottom" ? "-100%" : anchor === "top" ? "0%" : "-50%";
      const transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${lift}) scale(${scale.toFixed(3)})`;
      const opacity = alpha < 1 ? alpha.toFixed(2) : "";
      const depth = String(Math.round(object.depth || object.parentContainer?.depth || 0));
      const now = `${transform}|${opacity}|${depth}`;
      if (now === item.last) continue;
      if (item.last === "none" || !item.last) element.style.display = "";
      element.style.transform = transform;
      element.style.opacity = opacity;
      element.style.zIndex = depth;
      item.last = now;
    }
  }
}

const layers = new Map<Phaser.Scene, PlateLayer>();

/** The HTML layer over this scene's floor, made the first time a label asks for it. */
export function plateLayer(scene: Phaser.Scene): PlateLayer {
  let layer = layers.get(scene);
  if (!layer) {
    layer = new PlateLayer(scene);
    layers.set(scene, layer);
  }
  return layer;
}

let measurer: CanvasRenderingContext2D | null = null;

/** A label's text width in the layer's own units, for laying tags out before they're drawn. */
export function measure(text: string, font: string): number {
  measurer ??= document.createElement("canvas").getContext("2d");
  if (!measurer) return text.length * 6;
  measurer.font = font;
  return measurer.measureText(text).width;
}
