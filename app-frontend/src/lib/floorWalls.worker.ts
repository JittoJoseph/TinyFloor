/// <reference lib="webworker" />
import { paintShell, type ShellMap } from "@shared/shell";

// Paints the floor's walls and floors (lib/floorWalls) away from the page,
// which is busy starting the floor meanwhile. The pixels go back as they are,
// not as a picture: one drawn here can live on the graphics card, where some
// browsers' pages then read it as blank.
self.onmessage = async (event: MessageEvent<{ sheet: string; shell: ShellMap }>) => {
  try {
    const image = await createImageBitmap(await (await fetch(event.data.sheet)).blob());
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    const { width, height, data } = paintShell(event.data.shell, {
      width: image.width,
      height: image.height,
      data: context.getImageData(0, 0, image.width, image.height).data,
    });
    self.postMessage({ width, height, data }, [data.buffer]);
  } catch {
    self.postMessage(null);
  }
};
