// Emits the honeycomb tile, keeping only the hexagons that can actually touch
// the tile box — the first pass drew four screens' worth and clipped them away.
import { writeFileSync } from 'node:fs';

const s = 40;                       // hexagon side
const W = 3 * s;                    // horizontal period
const H = s * Math.sqrt(3);         // vertical period
const r = n => Math.round(n * 100) / 100;

const centres = [];
for (let col = -1; col <= 3; col++) {
  for (let row = -1; row <= 2; row++) {
    const x = col * 1.5 * s;
    const y = row * H + (Math.abs(col) % 2 ? H / 2 : 0);
    if (x < -s || x > W + s || y < -s || y > H + s) continue;   // cannot reach the box
    centres.push([x, y]);
  }
}

const hex = (cx, cy) => {
  const p = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    p.push(`${r(cx + s * Math.cos(a))} ${r(cy + s * Math.sin(a))}`);
  }
  return `M${p.join('L')}Z`;
};

const d = centres.map(([x, y]) => hex(x, y)).join('');

writeFileSync('patterns/hex-lattice.svg',
`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${r(H)}" viewBox="0 0 ${W} ${r(H)}">
<!-- Empower honeycomb. Flat-top hexagons, side 40: horizontal period 3s = 120,
     vertical period s*sqrt(3) = 69.28. Every hexagon that can cross the tile box
     is drawn and clipped by the viewport, so the lattice continues across repeats
     in both axes. Painted through CSS mask-image, so the black here is never seen —
     the colour comes from whatever background the mask is applied to. -->
<path d="${d}" fill="none" stroke="#000" stroke-width="2.5"/>
</svg>
`);
console.log(`${centres.length} hexagons, tile ${W}x${r(H)}`);
