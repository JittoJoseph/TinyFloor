// Labels drawn inside the Phaser canvas. The scene lives outside React, so the
// room page hands over the translated strings before the game boots.
export interface SceneText {
  sit: string;
  stand: string;
  meeting: string;
  music: string;
  draw: string;
  /** On your own desk's plate while you're away from it. */
  yourDesk: string;
}

let text: SceneText = {
  sit: "Press E to sit",
  stand: "Press E to stand",
  meeting: "Meeting",
  music: "Click for music",
  draw: "Click to draw",
  yourDesk: "Your desk",
};

export function setSceneText(next: SceneText) {
  text = next;
}

export function sceneText(): SceneText {
  return text;
}
