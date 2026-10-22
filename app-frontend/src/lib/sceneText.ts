// Labels drawn inside the Phaser canvas. The scene lives outside React, so the
// room page hands over the translated strings before the game boots.
export interface SceneText {
  meeting: string;
  /** On the whiteboard while someone else draws: "Drawing · Riley". */
  drawing: string;
  /** On your own desk's plate while you're away from it. */
  yourDesk: string;
  /** On a free desk's plate as you walk up to it. */
  claimDesk: string;
}

let text: SceneText = {
  meeting: "Meeting",
  drawing: "Drawing",
  yourDesk: "Your desk",
  claimDesk: "Claim desk",
};

export function setSceneText(next: SceneText) {
  text = next;
}

export function sceneText(): SceneText {
  return text;
}
