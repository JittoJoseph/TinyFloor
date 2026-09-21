/**
 * A dotted globe with a few lit points joined by arcs: Cloudflare's network,
 * drawn once on the server as plain SVG. Nothing here runs in the browser.
 */

const R = 150;
const TILT = (22 * Math.PI) / 180;
const SPIN = (-18 * Math.PI) / 180;

function project(latDeg: number, lonDeg: number) {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180 + SPIN;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  const y2 = y * Math.cos(TILT) - z * Math.sin(TILT);
  const z2 = y * Math.sin(TILT) + z * Math.cos(TILT);
  return { x: R * x, y: -R * y2, z: z2 };
}

const round = (value: number) => Math.round(value * 10) / 10;

const DOTS = (() => {
  const dots: Array<{ x: number; y: number; r: number; o: number }> = [];
  for (let lat = -78; lat <= 78; lat += 7.8) {
    const count = Math.max(6, Math.round(46 * Math.cos((lat * Math.PI) / 180)));
    for (let i = 0; i < count; i++) {
      const point = project(lat, (360 / count) * i);
      if (point.z <= 0.04) continue;
      dots.push({ x: round(point.x), y: round(point.y), r: round(0.7 + point.z * 1.1), o: round(0.18 + point.z * 0.55) });
    }
  }
  return dots;
})();

/** Roughly where some of the network's cities sit, as latitude and longitude. */
const CITIES: Array<[number, number]> = [
  [51.5, -0.1], // London
  [40.7, -74], // New York
  [19, 72.8], // Mumbai
  [6.5, 3.4], // Lagos
  [-23.5, -46.6], // São Paulo
  [25.2, 55.3], // Dubai
  [-1.3, 36.8], // Nairobi
  [52.5, 13.4], // Berlin
  [-26.2, 28], // Johannesburg
];

const NODES = CITIES.map(([lat, lon]) => project(lat, lon));
const lit = (index: number) => NODES[index].z > 0.08;

const LINKS: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [3, 4],
  [7, 5],
  [5, 6],
  [8, 2],
];

/** A great-circle hop between two cities, lifted off the surface in the middle. */
function arc(from: [number, number], to: [number, number]) {
  const toVector = ([lat, lon]: [number, number]) => {
    const a = (lat * Math.PI) / 180;
    const b = (lon * Math.PI) / 180;
    return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)];
  };
  const p = toVector(from);
  const q = toVector(to);
  const angle = Math.acos(Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
  const steps = 28;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k1 = Math.sin((1 - t) * angle) / Math.sin(angle);
    const k2 = Math.sin(t * angle) / Math.sin(angle);
    const v = [0, 1, 2].map((axis) => k1 * p[axis] + k2 * q[axis]);
    const lat = (Math.asin(v[2]) * 180) / Math.PI;
    const lon = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
    const lift = 1 + Math.sin(Math.PI * t) * angle * 0.22;
    const point = project(lat, lon);
    points.push(`${round(point.x * lift)} ${round(point.y * lift)}`);
  }
  return `M${points.join("L")}`;
}

export function NetworkGlobe({ className }: { className?: string }) {
  return (
    <svg viewBox="-170 -170 340 340" className={className} aria-hidden>
      <circle r={R} fill="none" stroke="currentColor" strokeOpacity="0.12" />
      <g fill="currentColor">
        {DOTS.map((dot, index) => (
          <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} opacity={dot.o} />
        ))}
      </g>
      <g fill="none" stroke="var(--ui-brand)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        {LINKS.filter(([a, b]) => lit(a) && lit(b)).map(([a, b]) => (
          <path key={`${a}-${b}`} d={arc(CITIES[a], CITIES[b])} opacity="0.8" />
        ))}
      </g>
      {NODES.map((node, index) => lit(index) && (
        <g key={index} transform={`translate(${round(node.x)} ${round(node.y)})`}>
          <circle r="7" fill="var(--ui-brand)" opacity="0.16" />
          <circle r="3" fill="var(--ui-brand)" />
        </g>
      ))}
    </svg>
  );
}
