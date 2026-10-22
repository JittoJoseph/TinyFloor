// Labels drawn inside the Phaser canvas. The scene lives outside React, so the
// room page hands over the translated strings before the game boots.
export interface SceneText {
  meeting: string;
  /** On the whiteboard while someone else draws: "Drawing · Riley". */
  drawing: string;
  /** On your own desk's plate while you're away from it. */
  yourDesk: string;
  /** On a free desk's chip, as you walk up to it or point at it. */
  claimDesk: string;
  /** Asked on the desk when claiming it would free yours. */
  claimTitle: string;
  claimNote: string;
  claimConfirm: string;
  cancel: string;
}

let text: SceneText = {
  meeting: "Meeting",
  drawing: "Drawing",
  yourDesk: "Your desk",
  claimDesk: "Claim desk",
  claimTitle: "Claim this desk?",
  claimNote: "Your current desk will be freed.",
  claimConfirm: "Claim",
  cancel: "Cancel",
};

export function setSceneText(next: SceneText) {
  text = next;
}

export function sceneText(): SceneText {
  return text;
}
