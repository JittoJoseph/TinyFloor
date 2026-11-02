import * as Phaser from "phaser";

/** How far a press has to move, in CSS pixels, before it's a drag and not a click. */
const DRAG_START = 5;
/** How the view comes back to you: the share of the way it goes each 60th of a second, and never faster than this (CSS pixels a second). */
const RETURN = 0.1;
const RETURN_SPEED = 2400;
/** Dragging, the view eases after the pointer rather than jumping with it: the share of the way it goes each 60th of a second. */
const DRAG_EASE = 0.18;
/** A fling slows to a stop: its speed falls to a third in about this many milliseconds. */
const FLING_FADE = 220;
/** Moves in the last this many milliseconds of a drag say how fast it was let go. */
const FLING_WINDOW = 90;

type Point = { x: number; y: number };

/**
 * Whether a press on the floor was a drag of it, not a click: everything that
 * acts on a click (walking there, a seat, the whiteboard) acts when the press
 * ends, and not after a drag.
 */
export function wasDrag(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): boolean {
  return pointer.getDistance() > DRAG_START / scene.scale.zoom;
}

/**
 * Whether a press began or ended on the page over the floor (the dock, a
 * panel) rather than on the floor: Phaser still hands its release to whatever
 * on the floor is under it, so a chair beneath the dock would take the dock's click.
 */
export function offFloor(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): boolean {
  return pointer.downElement !== scene.game.canvas || pointer.upElement !== scene.game.canvas;
}

/**
 * The floor's camera, all in one place. It follows you, the way it always
 * has (gently, with some room before it moves). Dragging the floor (left,
 * right or middle button) takes the view away from you, with the grabbing
 * hand: the view eases after the pointer, so a shaky hand or an uneven mouse
 * still moves it smoothly, and let go it coasts on and slows. It stays where
 * you left it until you set off yourself (a key, a click, an errand), then
 * glides back.
 * Zooming keeps still whatever it zooms on: where the pointer is when you're
 * looking round, you when it's following you. It never jumps: Phaser's own
 * follow snaps to its target when it starts, so it only starts once the view
 * is already there.
 */
export class CameraRig {
  private following = true;
  private returning = false;
  private press: { x: number; y: number; button: number } | null = null;
  private drag: { x: number; y: number; scrollX: number; scrollY: number; moves: Array<{ t: number; x: number; y: number }> } | null = null;
  private fling: Point | null = null;
  /** Where a drag, or the coast after one, is taking the view: the camera eases there a frame at a time. */
  private goal: Point | null = null;
  private zooming: Phaser.Tweens.Tween | null = null;
  private lerp: number;

  constructor(
    private scene: Phaser.Scene,
    private target: Phaser.GameObjects.Components.Transform,
    lerp: number,
    /** Whether the floor can be dragged now: not while something else has the pointer (decorating a desk). */
    private canDrag: () => boolean,
  ) {
    this.lerp = lerp;
    this.camera.startFollow(target, false, lerp, lerp);
    const input = scene.input;
    input.on(Phaser.Input.Events.POINTER_DOWN, this.down, this);
    input.on(Phaser.Input.Events.POINTER_MOVE, this.move, this);
    input.on(Phaser.Input.Events.POINTER_UP, this.up, this);
    input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.up, this);
  }

  private get camera() {
    return this.scene.cameras.main;
  }

  /** Canvas pixels per CSS pixel. */
  private get density() {
    return 1 / this.scene.scale.zoom;
  }

  /** Whether the view is looking round, away from you. */
  lookingAway(): boolean {
    return !this.following;
  }

  /** Back to you: the view glides there and follows you again. */
  comeBack() {
    if (this.following || this.drag) return;
    this.fling = null;
    this.goal = null;
    this.returning = true;
  }

  /** Follow you again at once, from wherever the view is (it glides, it doesn't snap). */
  follow() {
    this.following = false;
    this.comeBack();
  }

  /** Hands the camera to someone else (the desk decorator), until follow(). */
  release() {
    this.camera.stopFollow();
    this.following = false;
    this.returning = false;
    this.fling = null;
    this.goal = null;
    this.endDrag();
  }

  private down(pointer: Phaser.Input.Pointer) {
    // A press stops a coast where it is.
    this.fling = null;
    this.goal = null;
    if (!this.canDrag()) return;
    this.press = { x: pointer.x, y: pointer.y, button: pointer.button };
    // A right or middle press is only ever a drag.
    if (pointer.button !== 0) this.startDrag(pointer);
  }

  private lastPointer: Point = { x: 0, y: 0 };

  private move(pointer: Phaser.Input.Pointer) {
    this.lastPointer = { x: pointer.x, y: pointer.y };
    if (!this.press || !pointer.isDown) return;
    if (!this.drag) {
      if (Math.hypot(pointer.x - this.press.x, pointer.y - this.press.y) <= DRAG_START * this.density) return;
      this.startDrag(pointer);
    }
    const drag = this.drag!;
    const camera = this.camera;
    this.goal = {
      x: camera.clampX(drag.scrollX - (pointer.x - drag.x) / camera.zoom),
      y: camera.clampY(drag.scrollY - (pointer.y - drag.y) / camera.zoom),
    };
    // The page's clock, not the game's: moves come faster than frames, and a frame's time would make a fling too fast.
    const now = performance.now();
    drag.moves.push({ t: now, ...this.goal });
    while (drag.moves.length > 2 && now - drag.moves[0].t > FLING_WINDOW) drag.moves.shift();
  }

  private up() {
    this.press = null;
    const drag = this.drag;
    if (!drag) return;
    this.endDrag();
    // Let go moving: it carries on a little, slowing, the way a map does.
    const now = performance.now();
    const recent = drag.moves.filter((m) => now - m.t <= FLING_WINDOW);
    if (recent.length >= 2) {
      const [a, b] = [recent[0], recent[recent.length - 1]];
      const dt = Math.max(16, b.t - a.t);
      const v = { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
      if (Math.hypot(v.x, v.y) * this.camera.zoom > 0.15 * this.density) this.fling = v;
    }
  }

  private startDrag(pointer: Phaser.Input.Pointer) {
    const camera = this.camera;
    camera.stopFollow();
    this.following = false;
    this.returning = false;
    this.drag = { x: pointer.x, y: pointer.y, scrollX: camera.scrollX, scrollY: camera.scrollY, moves: [] };
    this.scene.input.setDefaultCursor("grabbing");
  }

  private endDrag() {
    if (!this.drag) return;
    this.drag = null;
    this.scene.input.setDefaultCursor("");
  }

  update(delta: number) {
    const camera = this.camera;
    if (this.fling && this.goal) {
      // Coasting: where the view is headed moves on, slowing; the view eases after it as it did the pointer.
      const { x, y } = this.fling;
      const nx = camera.clampX(this.goal.x + x * delta);
      const ny = camera.clampY(this.goal.y + y * delta);
      // Stopped by an edge on one side, it keeps going along it on the other.
      const fade = Math.exp(-delta / FLING_FADE);
      this.fling = { x: nx === this.goal.x + x * delta ? x * fade : 0, y: ny === this.goal.y + y * delta ? y * fade : 0 };
      this.goal = { x: nx, y: ny };
      if (Math.hypot(this.fling.x, this.fling.y) * camera.zoom < 0.01) this.fling = null;
    }
    if (this.goal) {
      const share = 1 - Math.pow(1 - DRAG_EASE, delta / (1000 / 60));
      const nx = camera.scrollX + (this.goal.x - camera.scrollX) * share;
      const ny = camera.scrollY + (this.goal.y - camera.scrollY) * share;
      camera.setScroll(nx, ny);
      // There, and nothing moving it on: done.
      if (!this.drag && !this.fling && Math.hypot(this.goal.x - nx, this.goal.y - ny) * camera.zoom < 0.5) {
        camera.setScroll(this.goal.x, this.goal.y);
        this.goal = null;
      }
    }
    if (this.returning) {
      const goalX = camera.clampX(this.target.x - camera.width / 2);
      const goalY = camera.clampY(this.target.y - camera.height / 2);
      const share = 1 - Math.pow(1 - RETURN, delta / (1000 / 60));
      const [dx, dy] = [goalX - camera.scrollX, goalY - camera.scrollY];
      // Eased in as it nears you, and capped on the way, so a long way back is a glide, not a lurch.
      const most = (RETURN_SPEED * this.density * delta) / 1000 / camera.zoom;
      const cut = Math.min(1, most / Math.max(1e-6, Math.hypot(dx, dy) * share));
      const nx = camera.scrollX + dx * share * cut;
      const ny = camera.scrollY + dy * share * cut;
      if (Math.hypot(goalX - nx, goalY - ny) * camera.zoom < 1) {
        // There: from here Phaser's follow takes over, and its snap is a pixel at most.
        this.returning = false;
        this.following = true;
        camera.startFollow(this.target, false, this.lerp, this.lerp);
      } else camera.setScroll(nx, ny);
    }
  }

  /**
   * Zooms to `zoom`, smoothly, keeping one point of the floor where it is on
   * screen: you, while following you; otherwise the point at `anchor` (canvas
   * pixels, the pointer's), or the middle of the view.
   */
  zoomTo(zoom: number, anchor?: Point, onUpdate?: () => void) {
    const camera = this.camera;
    this.zooming?.stop();
    // A drag or a coast under way is let go where the view is: its goal was worked out for the old zoom.
    this.fling = null;
    this.goal = null;
    if (this.drag) Object.assign(this.drag, { scrollX: camera.scrollX, scrollY: camera.scrollY, x: this.lastPointer.x, y: this.lastPointer.y, moves: [] });
    const from = { z: camera.zoom };
    const ox = camera.width / 2, oy = camera.height / 2;
    // The floor point kept still, and where on screen it is.
    const screen = this.following || this.returning ? { x: ox + camera.zoom * (this.target.x - camera.scrollX - ox), y: oy + camera.zoom * (this.target.y - camera.scrollY - oy) } : (anchor ?? { x: ox, y: oy });
    const world = { x: (screen.x - ox) / camera.zoom + camera.scrollX + ox, y: (screen.y - oy) / camera.zoom + camera.scrollY + oy };
    this.zooming = this.scene.tweens.add({
      targets: from,
      z: zoom,
      duration: 160,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        camera.setZoom(from.z);
        // Whatever it zooms on stays put, so following you doesn't then have to catch up.
        camera.setScroll(camera.clampX(world.x - (screen.x - ox) / from.z - ox), camera.clampY(world.y - (screen.y - oy) / from.z - oy));
        onUpdate?.();
      },
      onComplete: () => (this.zooming = null),
    });
  }

  destroy() {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN, this.down, this);
    input.off(Phaser.Input.Events.POINTER_MOVE, this.move, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.up, this);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.up, this);
    this.zooming?.stop();
    this.scene.input.setDefaultCursor("");
  }
}
