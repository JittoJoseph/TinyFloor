// Labels drawn inside the Phaser canvas. The scene lives outside React, so the
// room page hands over the translated strings before the game boots.
export interface SceneText {
  guide: string;
  sit: string;
  stand: string;
  joinMeeting: string;
  meeting: string;
  music: string;
  draw: string;
}

let text: SceneText = {
  guide: "Guide",
  sit: "Press E to sit",
  stand: "Press E to stand",
  joinMeeting: "Press E to join",
  meeting: "Meeting",
  music: "Click for music",
  draw: "Click to draw",
};

export function setSceneText(next: SceneText) {
  text = next;
}

export function sceneText(): SceneText {
  return text;
}
