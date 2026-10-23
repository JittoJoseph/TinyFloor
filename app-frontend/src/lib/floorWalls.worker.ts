/// <reference lib="webworker" />
import { paintShell, type ShellMap } from "@shared/shell";

// Paints the floor's walls and floors (lib/floorWalls) away from the page, which is busy starting the floor meanwhile.
self.onmessage = async (event: MessageEvent<{ sheet: string; shell: ShellMap }>) => {
  try {
    const image = await createImageBitmap(await (await fetch(event.data.sheet)).blob());
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image, 0, 0);
    const pixels = paintShell(event.data.shell, { width: image.width, height: image.height, data: context.getImageData(0, 0, image.width, image.height).data });
    const out = new OffscreenCanvas(pixels.width, pixels.height);
    out.getContext("2d")!.putImageData(new ImageData(pixels.data as Uint8ClampedArray<ArrayBuffer>, pixels.width, pixels.height), 0, 0);
    const painted = out.transferToImageBitmap();
    self.postMessage(painted, [painted]);
  } catch {
    self.postMessage(null);
  }
};
