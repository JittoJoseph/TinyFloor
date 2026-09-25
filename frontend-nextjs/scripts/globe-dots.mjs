// The dots of the home page's globe (components/home/previews/NetworkGlobe.tsx),
// drawn once into public/globe-dots.svg. The page lays them on as a mask, so
// they wear the text colour of either theme, and some 360 circles stay out of
// the page and its payload. Run again only if the globe's shape changes:
//   node scripts/globe-dots.mjs
import { writeFile } from "node:fs/promises";

// Keep in step with NetworkGlobe.tsx.
const R = 150;
const TILT = (22 * Math.PI) / 180;
const SPIN = (-18 * Math.PI) / 180;

function project(latDeg, lonDeg) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180 + SPIN;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
  const z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
  return { x: R * x, y: -R * y2, z: z2 };
}

const round = (value) => Math.round(value * 10) / 10;

const circles = [];
for (let lat = -78; lat <= 78; lat += 7.8) {
  const count = Math.max(6, Math.round(46 * Math.cos((lat * Math.PI) / 180)));
  for (let i = 0; i < count; i++) {
    const point = project(lat, (360 / count) * i);
    if (point.z <= 0.04) continue;
    circles.push(`<circle cx="${round(point.x)}" cy="${round(point.y)}" r="${round(0.7 + point.z * 1.1)}" opacity="${round(0.18 + point.z * 0.55)}"/>`);
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-170 -170 340 340" width="340" height="340"><g fill="#fff">${circles.join("")}</g></svg>\n`;
await writeFile(new URL("../public/globe-dots.svg", import.meta.url), svg);
console.log(`globe: ${circles.length} dots, ${svg.length} bytes`);
