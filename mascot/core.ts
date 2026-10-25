// Prue v3: the Precedent shipping container that prints receipts.
// Single source of truth: components/prue.tsx is generated from this file by `node mascot/build.mjs`.

export type PrueState = "idle" | "thinking" | "learned" | "confused" | "hello" | "held" | "falling" | "landed";
export type PrueMood = "neutral" | "happy" | "think";
export const PRUE_STATES: PrueState[] = ["idle", "thinking", "learned", "confused", "hello", "held", "falling", "landed"];
export const moodToState: Record<PrueMood, PrueState> = { neutral: "idle", happy: "hello", think: "thinking" };

export const PRUE_COLORS = {
  blue: "#2B63DD", blueLight: "#5089F3", blueDeep: "#1A45AE", side: "#1E4AB4",
  navy: "#13235A", screen: "#FFFFFF", bezel: "#DCE5F6", paper: "#FFFDF8",
  ink: "#6F9BEE", tag: "#E7D6B8", tagEdge: "#C9B28A", coral: "#F07C78", sun: "#F5C451",
};
const K = PRUE_COLORS;

// Which optional parts each state shows. Everything else is always drawn.
const SHOW: Record<PrueState, string[]> = {
  idle: ["arm-l", "arm-r", "eyes", "brows", "m-smile"],
  thinking: ["arm-l", "arm-r", "eyes", "brows-think", "m-o", "dots"],
  learned: ["arm-l-up", "arm-wave", "eyes-happy", "brows", "m-grin", "confetti", "stamp"],
  confused: ["arm-l-chin", "arm-r", "eyes", "brows-worry", "m-worry", "q"],
  hello: ["arm-l", "arm-wave", "eyes", "brows", "m-grin"],
  // Picked up by the user: legs kick, arms flail, wide eyes and an "o".
  held: ["arm-l-flail", "arm-r-flail", "eyes-wide", "brows-up", "m-oh"],
  // In the air: arms up and out, eyes squeezed shut, screaming; air streams up past her.
  falling: ["arm-l-out", "arm-r-out", "eyes-shut", "brows-worry", "m-scream", "speed"],
  // Hits the floor: squash, spiral eyes, stars and dust, then she shakes it off.
  landed: ["arm-l", "arm-r", "eyes", "eyes-dizzy", "brows-worry", "m-worry", "stars", "dust"],
};

const mitt = (x: number, y: number, r: number, p: string) =>
  `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse cx="-6.6" cy="-3.4" rx="3.9" ry="5" transform="rotate(-24 -6.6 -3.4)" fill="url(#${p}-mitt)" stroke="#C4CFE2" stroke-width="1.1"/><ellipse rx="10.2" ry="9.6" fill="url(#${p}-mitt)" stroke="#C4CFE2" stroke-width="1.1"/><ellipse cx="-2.5" cy="-3.6" rx="3.6" ry="2.2" fill="#fff" opacity=".9"/></g>`;

const pen = (x: number, y: number, r: number, p: string) =>
  `<g transform="translate(${x} ${y}) rotate(${r}) scale(1.15)"><path d="M-3.8 10 L3.8 10 L1 19.5 Q0 21 -1 19.5 Z" fill="#2A3352"/><rect x="-4.8" y="-36" width="9.6" height="48" rx="4.8" fill="url(#${p}-pen)"/><rect x="-4.8" y="3" width="9.6" height="6.5" fill="#1A3E9C"/><rect x="-4.8" y="-45" width="9.6" height="11" rx="4.2" fill="#1A3E9C"/><rect x="-1.4" y="-50" width="2.8" height="6" rx="1.4" fill="#fff"/><path d="M4.6 -38 h2.6 v21 q0 3 -3 3" fill="none" stroke="#183A92" stroke-width="2.2" stroke-linecap="round"/><rect x="-2.9" y="-32" width="2" height="34" rx="1" fill="#fff" opacity=".38"/></g>`;

const arm = (d: string) =>
  `<path d="${d}" fill="none" stroke="${K.blueDeep}" stroke-width="15" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${K.blue}" stroke-width="11.5" stroke-linecap="round"/>`;

export function prueDefs(p: string) {
  return `<defs>
<linearGradient id="${p}-front" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3D76EC"/><stop offset="1" stop-color="#2157D2"/></linearGradient>
<linearGradient id="${p}-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2352C4"/><stop offset="1" stop-color="#173E9E"/></linearGradient>
<linearGradient id="${p}-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A9BF7"/><stop offset="1" stop-color="#4880F0"/></linearGradient>
<linearGradient id="${p}-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9EEF8"/><stop offset=".16" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F3F5FA"/></linearGradient>
<radialGradient id="${p}-eye" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#3A57A8"/><stop offset=".55" stop-color="#17275F"/><stop offset="1" stop-color="#0B1538"/></radialGradient>
<linearGradient id="${p}-paper" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#FBF9F4"/><stop offset="1" stop-color="#ECE8DF"/></linearGradient>
<linearGradient id="${p}-roll" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4DED2"/><stop offset=".42" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DAD3C5"/></linearGradient>
<linearGradient id="${p}-foot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A82F2"/><stop offset="1" stop-color="#1E4FC2"/></linearGradient>
<radialGradient id="${p}-mitt" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F4F6FB"/><stop offset="1" stop-color="#DCE3EF"/></radialGradient>
<linearGradient id="${p}-pen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4C84F3"/><stop offset="1" stop-color="#2154CC"/></linearGradient>
<linearGradient id="${p}-tag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0E3CB"/><stop offset="1" stop-color="#DCC7A2"/></linearGradient>
<clipPath id="${p}-clip"><rect x="0" y="-80" width="240" height="203"/></clipPath>
<filter id="${p}-blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>`;
}

export function prueBody(p: string) {
  const v = (name: string, inner: string) => `<g class="pc-v pc-${name}">${inner}</g>`;
  const T = 136, B = 268; // front face top / bottom
  const groove = (x: number, y: number, w: number, h: number) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="#1844AE"/>` +
    (w < h ? `<rect x="${x + w - 1.5}" y="${y + 2}" width="1.6" height="${h - 4}" rx=".8" fill="#7BA5F8" opacity=".75"/>`
           : `<rect x="${x + 1.5}" y="${y + h - 1.4}" width="${w - 3}" height="1.4" rx=".7" fill="#7BA5F8" opacity=".75"/>`);
  const slots = Array.from({ length: 8 }, (_, i) => groove(83 + i * 11.6, 231, 6.8, 20)).join("");
  const grooves = [55, 63, 71].map((x) => groove(x, 154, 5.2, 58)).join("");
  const vents = [220, 228, 236, 244].map((y) => groove(54, y, 23, 4.8)).join("");
  const sideRidges = [185, 191].map((x) => {
    const t = T - ((x - 180) * 12) / 18 + 9, b = B - ((x - 180) * 12) / 18 - 9;
    return `<line x1="${x}" y1="${t}" x2="${x}" y2="${b}" stroke="#14378C" stroke-width="2.6" stroke-linecap="round"/><line x1="${x + 1.8}" y1="${t + 1}" x2="${x + 1.8}" y2="${b - 1}" stroke="#4778E4" stroke-width="1.1" stroke-linecap="round"/>`;
  }).join("");
  const topRidges = Array.from({ length: 8 }, (_, i) => {
    const x = 56 + i * 16.8;
    return `<path d="M${x} ${T - 1.6} l9 -7.6" stroke="#2C62D8" stroke-width="7.4" stroke-linecap="round"/><path d="M${x} ${T - 2.8} l9 -7.6" stroke="#8DB3FA" stroke-width="4" stroke-linecap="round"/>`;
  }).join("");
  const cast = (x: number, y: number) => `<rect x="${x}" y="${y}" width="15" height="14" rx="4" fill="#4A82F1"/><rect x="${x + 1}" y="${y + 1}" width="13" height="5" rx="2.5" fill="#fff" opacity=".18"/><rect x="${x + 4}" y="${y + 5}" width="7" height="4" rx="2" fill="#14378C"/>`;
  const lines = [[28, 70], [46, 66], [64, 70], [82, 58]].map(([y, w]) => `<line x1="76" y1="${y}" x2="${76 + w}" y2="${y}" stroke="${K.ink}" stroke-width="3" stroke-linecap="round"/>`).join("");
  const confetti = [
    [-74, -62, 220, K.blue], [-48, -96, -160, K.sun], [-18, -112, 300, K.coral], [22, -108, -260, K.blueLight],
    [52, -92, 200, K.tag], [78, -60, -220, K.blue], [-88, -20, 160, K.blueLight], [90, -18, -140, K.sun],
    [-60, -40, 260, K.coral], [64, -36, -300, K.blueLight], [6, -122, 180, K.blue], [-34, -78, -200, K.tagEdge],
  ].map(([x, y, r, c], i) => i % 2
    ? `<rect class="pc-cf" style="--x:${x}px;--y:${y}px;--r:${r}deg;--d:${(i % 4) * 30}ms" x="-4.5" y="-2.2" width="9" height="4.4" rx="1.5" fill="${c}"/>`
    : `<circle class="pc-cf" style="--x:${x}px;--y:${y}px;--r:${r}deg;--d:${(i % 4) * 30}ms" r="3.4" fill="${c}"/>`).join("");
  const ex = [108.5, 143.5], ey = 184;
  // Air streaming up past her while she falls.
  const speed = [[16, 150, 40, 0], [30, 214, 28, 160], [12, 262, 24, 280], [216, 166, 44, 80], [230, 230, 30, 240], [210, 98, 22, 340]]
    .map(([x, y, l, d]) => `<line class="pc-sl" style="--d:${d}ms" x1="${x}" y1="${y}" x2="${x}" y2="${y + l}"/>`).join("");
  // Little sparkles that pop around her head on landing.
  const stars = [[34, 124, 0], [212, 104, 70], [226, 146, 140], [52, 92, 210]].map(([x, y, d]) =>
    `<g transform="translate(${x} ${y})"><path class="pc-star" style="--d:${d}ms" d="M0 -8 Q1.4 -1.4 8 0 Q1.4 1.4 0 8 Q-1.4 1.4 -8 0 Q-1.4 -1.4 0 -8 Z" fill="${K.sun}" stroke="#E2A93A" stroke-width="1" stroke-linejoin="round"/></g>`).join("");
  // Dust kicked out from under her feet on landing.
  const dust = [[68, 293, -26, 6.5], [76, 298, -14, 4.6], [173, 293, 26, 6.5], [165, 298, 14, 4.6]].map(([x, y, dx, r]) =>
    `<g transform="translate(${x} ${y})"><circle class="pc-dust" style="--x:${dx}px" r="${r}" fill="${K.bezel}" stroke="#C4CFE2" stroke-width="1.1"/></g>`).join("");

  return `<ellipse class="pc-shadow" cx="122" cy="301" rx="74" ry="7" fill="${K.navy}" opacity=".17" filter="url(#${p}-blur)"/>
<g class="pc-rig">
 <g class="pc-legs">${[[81, 74], [137, 131]].map(([x, f], i) => `
  <g class="pc-leg-${i ? "r" : "l"}"><rect x="${x}" y="258" width="23" height="34" rx="9" fill="#1D4CBF"/><rect x="${x + 5}" y="266" width="5" height="20" rx="2.5" fill="#fff" opacity=".14"/>
  <path d="M${f} 296 Q${f} 284 ${f + 18} 284 Q${f + 36} 284 ${f + 36} 296 Z" fill="url(#${p}-foot)" stroke="url(#${p}-foot)" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="${f + 14}" cy="288" rx="7" ry="2.6" fill="#fff" opacity=".3"/></g>`).join("")}
 </g>
 <g class="pc-upper">
  <path d="M180 ${T} L198 ${T - 16} L198 ${B - 14} L180 ${B} Z" fill="url(#${p}-side)" stroke="#1D47AE" stroke-width="7" stroke-linejoin="round"/>
  ${sideRidges}
  ${cast(183, B - 26)}
  <path d="M48 ${T} L68 ${T - 16} L198 ${T - 16} L180 ${T} Z" fill="url(#${p}-top)" stroke="#4A82F1" stroke-width="6" stroke-linejoin="round"/>
  <line x1="68" y1="${T - 13}" x2="176" y2="${T - 13}" stroke="#0E2A6E" stroke-width="4.5" stroke-linecap="round"/>
  <g clip-path="url(#${p}-clip)"><g class="pc-paper-pos"><g class="pc-paper">
   <rect x="60" y="-8" width="102" height="160" fill="url(#${p}-paper)" stroke="#D9D2C4" stroke-width="1.3"/>
   <rect x="60" y="-8" width="102" height="12" fill="#000" opacity=".05"/>
   ${lines}
   ${v("stamp", `<g class="pc-stamp-in"><circle cx="137" cy="99" r="15" fill="#fff" stroke="${K.blue}" stroke-width="3.2"/><circle cx="137" cy="99" r="10.6" fill="none" stroke="${K.blue}" stroke-width="1.3" stroke-dasharray="2 2.4"/><path d="M130 99 L135 104 L144.5 93.5" fill="none" stroke="${K.blue}" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></g>`)}
   <rect x="70" y="-28" width="92" height="30" rx="15" fill="url(#${p}-roll)" stroke="#D3CBBB" stroke-width="1.3"/>
   <circle cx="72" cy="-13" r="15" fill="#FFFEFA" stroke="#D3CBBB" stroke-width="1.3"/>
   <path d="M72 -13 m0 -3.2 a3.2 3.2 0 1 1 -3.2 3.2 a6.4 6.4 0 0 1 6.4 -6.4 a9.6 9.6 0 0 1 9.6 9.6 a12 12 0 0 1 -8 11.4" fill="none" stroke="#C9BFAC" stroke-width="1.8" stroke-linecap="round"/>
  </g></g></g>
  ${topRidges}
  ${v("arm-l", arm("M52 170 C22 164 12 190 34 200"))}
  ${v("arm-l-up", arm("M52 172 C30 168 22 150 26 132") + mitt(26, 127, -10, p))}
  ${v("arm-l-flail", `<g class="pc-flail-l">${arm("M52 172 C30 168 22 150 26 132") + mitt(26, 127, -10, p)}</g>`)}
  ${v("arm-l-out", `<g class="pc-out-l">${arm("M52 174 C32 164 16 146 10 122") + mitt(9, 116, -28, p)}</g>`)}
  <rect x="44" y="${T}" width="136" height="${B - T}" rx="17" fill="url(#${p}-front)"/>
  <rect x="51" y="${T + 7}" width="122" height="${B - T - 14}" rx="9" fill="#2458D0"/>
  <rect x="51" y="${T + 7}" width="122" height="${B - T - 14}" rx="9" fill="none" stroke="#163C9E" stroke-width="1.6" opacity=".7"/>
  <path d="M47.5 ${B - 10} V${T + 10} Q47.5 ${T + 3.5} 54 ${T + 3.5} H170" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".28"/>
  <rect x="51" y="${B - 20}" width="122" height="13" rx="6" fill="#163C9E" opacity=".18"/>
  ${grooves}${vents}${slots}
  ${cast(45, T + 1)}${cast(164, T + 1)}${cast(45, B - 15)}${cast(164, B - 15)}
  <rect x="77" y="${T + 8}" width="98" height="82" rx="17" fill="#1A47B6"/>
  <rect x="78.5" y="${T + 9.5}" width="95" height="79" rx="16" fill="${K.bezel}"/>
  <rect x="82" y="${T + 13}" width="88" height="72" rx="13" fill="url(#${p}-screen)"/>
  <rect x="82" y="${T + 13}" width="88" height="72" rx="13" fill="none" stroke="#C9D5EC" stroke-width="1.4"/>
  ${v("arm-l", mitt(40, 200, -30, p))}
  <g class="pc-face">
   ${v("eyes", `<g class="pc-look"><g class="pc-blink">${ex.map((x) => `<ellipse cx="${x}" cy="${ey}" rx="11.4" ry="13" fill="url(#${p}-eye)"/><ellipse cx="${x}" cy="${ey}" rx="9.8" ry="11.4" fill="none" stroke="#4466BE" stroke-width="1.3" opacity=".6"/><circle cx="${x + 3.8}" cy="${ey - 5}" r="4.2" fill="#fff"/><circle cx="${x - 3.8}" cy="${ey + 5.6}" r="1.9" fill="#fff" opacity=".85"/>`).join("")}</g></g>`)}
   ${v("eyes-happy", ex.map((x) => `<path d="M${x - 9} ${ey + 3} Q${x} ${ey - 11} ${x + 9} ${ey + 3}" fill="none" stroke="${K.navy}" stroke-width="4.2" stroke-linecap="round"/>`).join(""))}
   ${v("eyes-wide", ex.map((x) => `<ellipse cx="${x}" cy="${ey - 1}" rx="12.6" ry="15" fill="url(#${p}-eye)"/><ellipse cx="${x}" cy="${ey - 1}" rx="11" ry="13.4" fill="none" stroke="#4466BE" stroke-width="1.3" opacity=".6"/><circle cx="${x + 4.2}" cy="${ey - 6.5}" r="4.8" fill="#fff"/><circle cx="${x - 4}" cy="${ey + 5.4}" r="2.2" fill="#fff" opacity=".85"/>`).join(""))}
   ${v("eyes-shut", ex.map((x, i) => { const d = i ? -1 : 1; return `<path d="M${x - 8 * d} ${ey - 8} L${x + 7 * d} ${ey} L${x - 8 * d} ${ey + 8}" fill="none" stroke="${K.navy}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`; }).join(""))}
   ${v("eyes-dizzy", ex.map((x, i) => `<g transform="translate(${x} ${ey})"><g class="pc-spin${i ? " pc-spin-r" : ""}"><path d="M0 -2.4 a2.4 2.4 0 1 1 -2.4 2.4 a4.8 4.8 0 0 1 4.8 -4.8 a7.2 7.2 0 0 1 7.2 7.2 a9.6 9.6 0 0 1 -9.6 9.6" fill="none" stroke="${K.navy}" stroke-width="3.4" stroke-linecap="round"/></g></g>`).join(""))}
   ${v("brows", `<g class="pc-brow-lift"><path d="M98 166 Q108 159 118 163.5" fill="none" stroke="${K.navy}" stroke-width="4" stroke-linecap="round"/><path d="M134 163.5 Q144 159 154 166" fill="none" stroke="${K.navy}" stroke-width="4" stroke-linecap="round"/></g>`)}
   ${v("brows-think", `<path d="M100 168 Q109 165 118 167" fill="none" stroke="${K.navy}" stroke-width="4" stroke-linecap="round"/><path d="M134 163.5 Q143 157 152 163" fill="none" stroke="${K.navy}" stroke-width="4" stroke-linecap="round"/>`)}
   ${v("brows-up", `<path d="M97 160 Q108 151 119 157" fill="none" stroke="${K.navy}" stroke-width="4" stroke-linecap="round"/><path d="M133 157 Q144 151 155 160" fill="none" stroke="${K.navy}" stroke-width="4" stroke-linecap="round"/>`)}
   ${v("brows-worry", `<path d="M100 169 Q109 168.5 117 162" fill="none" stroke="${K.navy}" stroke-width="4" stroke-linecap="round"/><path d="M135 162 Q143 168.5 152 169" fill="none" stroke="${K.navy}" stroke-width="4" stroke-linecap="round"/>`)}
   ${v("m-smile", `<path d="M117 199 Q126 206.5 135 199" fill="none" stroke="${K.navy}" stroke-width="3" stroke-linecap="round"/>`)}
   ${v("m-o", `<ellipse cx="126" cy="202" rx="3.6" ry="3.3" fill="${K.navy}"/>`)}
   ${v("m-grin", `<path d="M116 197 Q126 198.2 136 197 Q134.5 210.5 126 210.5 Q117.5 210.5 116 197 Z" fill="${K.navy}" stroke="${K.navy}" stroke-width="1.6" stroke-linejoin="round"/><path d="M120.5 206.6 Q126 202 131.5 206.6 Q129 209.4 126 209.4 Q123 209.4 120.5 206.6 Z" fill="${K.coral}"/>`)}
   ${v("m-oh", `<ellipse cx="126" cy="204.5" rx="6.4" ry="8" fill="${K.navy}"/><ellipse cx="126" cy="209" rx="3.6" ry="2.2" fill="${K.coral}"/>`)}
   ${v("m-scream", `<path d="M117.5 199 Q126 195.5 134.5 199 Q137 212 126 214 Q115 212 117.5 199 Z" fill="${K.navy}" stroke="${K.navy}" stroke-width="1.6" stroke-linejoin="round"/><path d="M120 209.6 Q126 204.6 132 209.6 Q130 213 126 213 Q122 213 120 209.6 Z" fill="${K.coral}"/>`)}
   ${v("m-worry", `<path d="M119 204 Q122.5 199.5 126 202.5 Q129.5 205.5 133 201.5" fill="none" stroke="${K.navy}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)}
  </g>
  <g class="pc-tag">
   <path d="M176 233 C178 237 179 240 180 243" fill="none" stroke="#B9A47E" stroke-width="1.8" stroke-linecap="round"/>
   <g transform="translate(181 241) rotate(-12) scale(1.22)">
    <path d="M-6 0 L6 0 L13.5 9 L13.5 40 Q13.5 45 8.5 45 L-8.5 45 Q-13.5 45 -13.5 40 L-13.5 9 Z" fill="url(#${p}-tag)" stroke="${K.tagEdge}" stroke-width="1.3" stroke-linejoin="round"/>
    <circle cx="0" cy="7" r="2.6" fill="#F7F0E2" stroke="${K.tagEdge}" stroke-width="1.1"/>
    <path d="M-13.5 12 L-13.5 40 Q-13.5 45 -8.5 45 L-4 45" fill="none" stroke="#fff" stroke-width="1.2" opacity=".45"/>
   </g>
   <circle cx="175" cy="229" r="4.6" fill="none" stroke="#8E98AC" stroke-width="2.8"/>
   <circle cx="175" cy="229" r="4.2" fill="none" stroke="#D5DBE6" stroke-width="1" stroke-dasharray="4 20"/>
  </g>
  ${v("arm-l-chin", arm("M52 214 C40 242 72 246 92 226") + mitt(96, 220, 10, p))}
  ${v("arm-r", arm("M190 176 C208 178 214 192 203 202") + pen(201, 204, 16, p) + mitt(201, 204, 20, p))}
  ${v("arm-wave", `<g class="pc-wave">${arm("M190 178 C207 172 216 156 214 138") + pen(214, 132, 10, p) + mitt(214, 132, 20, p)}</g>`)}
  ${v("arm-r-flail", `<g class="pc-flail-r">${arm("M190 178 C207 172 216 156 214 138") + pen(214, 132, 14, p) + mitt(214, 132, 20, p)}</g>`)}
  ${v("arm-r-out", `<g class="pc-out-r">${arm("M190 176 C210 166 226 148 232 124") + pen(233, 118, 32, p) + mitt(233, 118, 30, p)}</g>`)}
 </g>
</g>
${v("dots", `<g fill="${K.blue}"><circle class="pc-dot" cx="178" cy="96" r="4.6"/><circle class="pc-dot" cx="193" cy="83" r="5.6"/><circle class="pc-dot" cx="210" cy="68" r="6.6"/></g>`)}
${v("q", `<g class="pc-q-in"><path d="M188 76 C188 64 208 63 208 75 C208 84 198 85 198 94" fill="none" stroke="${K.blue}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="198" cy="106" r="4.4" fill="${K.blue}"/></g>`)}
${v("confetti", `<g transform="translate(116 96)">${confetti}</g>`)}
${v("speed", `<g stroke="${K.blueLight}" stroke-width="3" stroke-linecap="round">${speed}</g>`)}
${v("stars", stars)}
${v("dust", dust)}`;
}

const EO = "cubic-bezier(0.23,1,0.32,1)";      // ease-out (emil)
const EIO = "cubic-bezier(0.77,0,0.175,1)";    // ease-in-out (emil)

export const PRUE_CSS = [
  `.pcm{overflow:visible;display:inline-block;vertical-align:middle}`,
  `.pcm *{transform-box:view-box}`,
  `.pcm .pc-v{display:none}`,
  `.pcm[data-compact=true] .pc-paper-pos,.pcm[data-compact=true] .pc-dots,.pcm[data-compact=true] .pc-q,.pcm[data-compact=true] .pc-confetti,.pcm[data-compact=true] .pc-speed,.pcm[data-compact=true] .pc-stars{visibility:hidden}`,
  ...(Object.keys(SHOW) as PrueState[]).map((s) => SHOW[s].map((n) => `.pcm[data-state=${s}] .pc-${n}`).join(",") + `{display:inline}`),
  // paper height per state (paper is translated down into the slot)
  `.pcm .pc-paper-pos{transform:translateY(0)}`,
  `.pcm[data-state=thinking] .pc-paper-pos{transform:translateY(24px)}`,
  `.pcm[data-state=learned] .pc-paper-pos{transform:translateY(0)}`,
  `.pcm[data-state=confused] .pc-paper-pos{transform:translateY(96px)}`,
  `.pcm[data-state=hello] .pc-paper-pos{transform:translateY(70px)}`,
  `.pcm[data-state=held] .pc-paper-pos{transform:translateY(40px)}`,
  `.pcm[data-state=falling] .pc-paper-pos{transform:translateY(-12px)}`,
  `.pcm[data-state=landed] .pc-paper-pos{transform:translateY(70px)}`,
  // airborne: no floor shadow; the tag streams up in the wind; landed starts on the spiral eyes
  `.pcm[data-state=held] .pc-shadow,.pcm[data-state=falling] .pc-shadow{opacity:0}`,
  `.pcm[data-state=falling] .pc-tag{transform:rotate(-120deg)}`,
  `.pcm[data-state=landed] .pc-eyes{opacity:0}`,
  `.pcm .pc-star,.pcm .pc-dust{opacity:0;transform-box:fill-box;transform-origin:center}.pcm .pc-sl{opacity:.55}`,
  `.pcm .pc-stamp-in{transform-origin:137px 99px;transform:rotate(-10deg)}`,
  `.pcm .pc-cf{opacity:0}`,
  // origins
  `.pcm .pc-rig{transform-origin:122px 298px}.pcm .pc-upper{transform-origin:122px 268px}`,
  `.pcm .pc-blink{transform-origin:126px 183px}.pcm .pc-paper{transform-origin:111px 130px}`,
  `.pcm .pc-tag{transform-origin:175px 229px}.pcm .pc-wave{transform-origin:190px 178px}.pcm .pc-q-in{transform-origin:198px 90px}`,
  `.pcm .pc-leg-l{transform-origin:92px 260px}.pcm .pc-leg-r{transform-origin:148px 260px}`,
  `.pcm .pc-flail-l{transform-origin:52px 172px}.pcm .pc-flail-r{transform-origin:190px 178px}.pcm .pc-out-l{transform-origin:52px 174px}.pcm .pc-out-r{transform-origin:190px 176px}`,
  // keyframes
  `@keyframes pc-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.012,1.028)}}`,
  `@keyframes pc-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.5px)}}`,
  `@keyframes pc-blink{0%,88%,96%,100%{transform:scaleY(1)}92%{transform:scaleY(.08)}}`,
  `@keyframes pc-flutter{0%,100%{transform:rotate(-1.4deg) skewX(0deg)}50%{transform:rotate(1.4deg) skewX(-1.5deg)}}`,
  `@keyframes pc-sway{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}`,
  `@keyframes pc-look{0%,100%{transform:translate(0,0)}20%,38%{transform:translate(4px,-4px)}55%,72%{transform:translate(-4px,-4.5px)}86%{transform:translate(0,-2px)}}`,
  `@keyframes pc-print{0%{transform:translateY(132px);opacity:1}6%,14%{transform:translateY(112px)}20%,28%{transform:translateY(94px)}34%,42%{transform:translateY(76px)}48%,56%{transform:translateY(58px)}62%,70%{transform:translateY(40px)}76%,90%{transform:translateY(24px);opacity:1}96%{transform:translateY(24px);opacity:0}97%{transform:translateY(132px);opacity:0}100%{transform:translateY(132px);opacity:1}}`,
  `@keyframes pc-jiggle{0%,100%{transform:translate(0,0)}25%{transform:translate(.7px,-.4px)}75%{transform:translate(-.7px,.3px)}}`,
  `@keyframes pc-dot{0%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}`,
  `@keyframes pc-hop{0%{transform:none}12%{transform:scale(1.07,.9)}32%{transform:translateY(-34px) scale(.95,1.07)}50%{transform:translateY(0) scale(1.09,.88)}62%{transform:scale(.98,1.03)}74%,100%{transform:none}}`,
  `@keyframes pc-shoot{0%{transform:translateY(60px)}14%{transform:translateY(68px)}36%{transform:translateY(-12px)}52%{transform:translateY(3px)}64%,100%{transform:translateY(0)}}`,
  `@keyframes pc-stamp{0%,46%{opacity:0;transform:scale(1.9) rotate(-34deg)}58%{opacity:1;transform:scale(.92) rotate(-8deg)}66%,100%{opacity:1;transform:scale(1) rotate(-10deg)}}`,
  `@keyframes pc-confetti{0%,40%{opacity:0;transform:translate(0,0) rotate(0)}46%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translate(var(--x),calc(var(--y) + 26px)) rotate(var(--r))}}`,
  `@keyframes pc-tilt{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(-8deg)}}`,
  `@keyframes pc-q{0%{opacity:0;transform:scale(.4) rotate(-20deg)}14%{opacity:1;transform:scale(1.12) rotate(6deg)}24%{transform:scale(1) rotate(0)}62%{transform:translateY(-3px) rotate(4deg)}100%{transform:none}}`,
  `@keyframes pc-wave{0%,50%,100%{transform:rotate(0)}12%,37%{transform:rotate(18deg)}25%{transform:rotate(-10deg)}}`,
  `@keyframes pc-bounce{0%,50%,100%{transform:translateY(0)}20%{transform:translateY(-6px)}36%{transform:translateY(0) scale(1.02,.97)}}`,
  `@keyframes pc-kick{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(18deg)}}`,
  `@keyframes pc-flail{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(12deg)}}`,
  `@keyframes pc-flap{0%,100%{transform:rotate(-4deg) skewX(3deg)}50%{transform:rotate(4deg) skewX(-3deg)}}`,
  `@keyframes pc-whirl{0%,100%{transform:rotate(-24deg)}50%{transform:rotate(24deg)}}`,
  `@keyframes pc-buffet{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}`,
  `@keyframes pc-dangle-l{0%,100%{transform:rotate(5deg)}50%{transform:rotate(16deg)}}`,
  `@keyframes pc-dangle-r{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(-16deg)}}`,
  `@keyframes pc-stream{0%,100%{transform:skewX(-3deg) scaleY(1.02)}50%{transform:skewX(3deg) scaleY(.99)}}`,
  `@keyframes pc-tagwhip{0%,100%{transform:rotate(-108deg)}50%{transform:rotate(-132deg)}}`,
  `@keyframes pc-speed{0%{opacity:0;transform:translateY(36px)}25%{opacity:.75}100%{opacity:0;transform:translateY(-56px)}}`,
  `@keyframes pc-land{0%{transform:scale(1.12,.85)}22%{transform:scale(.95,1.06)}40%{transform:scale(1.04,.96)}58%{transform:scale(.99,1.01)}72%,100%{transform:none}}`,
  `@keyframes pc-jolt{0%{transform:translateY(52px)}24%{transform:translateY(84px)}46%{transform:translateY(64px)}64%,100%{transform:translateY(70px)}}`,
  `@keyframes pc-spin{to{transform:rotate(540deg)}}@keyframes pc-spin-r{to{transform:rotate(-540deg)}}`,
  `@keyframes pc-dizzy{0%,70%{opacity:1}90%,100%{opacity:0}}@keyframes pc-unblur{0%,70%{opacity:0}90%,100%{opacity:1}}`,
  `@keyframes pc-star{0%{opacity:0;transform:scale(.2) rotate(-40deg)}20%{opacity:1;transform:scale(1.15) rotate(10deg)}60%{opacity:1;transform:translateY(-6px) scale(1) rotate(30deg)}100%{opacity:0;transform:translateY(-12px) scale(.6) rotate(60deg)}}`,
  `@keyframes pc-dust{0%{opacity:0;transform:scale(.3)}12%{opacity:.95}100%{opacity:0;transform:translate(var(--x),-7px) scale(1.5)}}`,
  // state → motion
  `.pcm[data-state=idle] .pc-upper{animation:pc-breathe 2.4s ease-in-out infinite}`,
  `.pcm[data-state=idle] .pc-rig,.pcm[data-state=confused] .pc-rig{animation:pc-bob 2.4s ease-in-out infinite}`,
  `.pcm .pc-blink{animation:pc-blink 4.8s linear infinite}`,
  `.pcm[data-state=idle] .pc-paper,.pcm[data-state=hello] .pc-paper,.pcm[data-state=confused] .pc-paper{animation:pc-flutter 2.4s ease-in-out infinite}`,
  `.pcm .pc-tag{animation:pc-sway 2.4s ease-in-out infinite}`,
  `.pcm[data-state=thinking] .pc-look{animation:pc-look 2.4s ${EIO} infinite}`,
  `.pcm[data-state=thinking] .pc-paper-pos{animation:pc-print 4.8s ${EO} infinite}`,
  `.pcm[data-state=thinking] .pc-upper{animation:pc-jiggle .4s linear infinite}`,
  `.pcm[data-state=thinking] .pc-dot{animation:pc-dot 1.2s ease-in-out infinite}`,
  `.pcm[data-state=thinking] .pc-dot:nth-child(2){animation-delay:.15s}.pcm[data-state=thinking] .pc-dot:nth-child(3){animation-delay:.3s}`,
  `.pcm[data-state=learned] .pc-rig{animation:pc-hop 2.4s ${EO} both}`,
  `.pcm[data-state=learned] .pc-paper-pos{animation:pc-shoot 2.4s ${EO} both}`,
  `.pcm[data-state=learned] .pc-stamp-in{animation:pc-stamp 2.4s ${EO} both}`,
  `.pcm[data-state=learned] .pc-cf{animation:pc-confetti 2.4s ${EO} both;animation-delay:var(--d)}`,
  `.pcm[data-state=learned][data-loop=true] .pc-rig,.pcm[data-state=learned][data-loop=true] .pc-paper-pos,.pcm[data-state=learned][data-loop=true] .pc-stamp-in,.pcm[data-state=learned][data-loop=true] .pc-cf{animation-iteration-count:infinite}`,
  `.pcm[data-state=confused] .pc-upper{animation:pc-tilt 2.4s ease-in-out infinite}`,
  `.pcm[data-state=confused] .pc-q-in{animation:pc-q 2.4s ${EO} infinite}`,
  `.pcm[data-state=hello] .pc-wave{animation:pc-wave 2.4s ${EIO} infinite}`,
  `.pcm[data-state=hello] .pc-rig{animation:pc-bounce 2.4s ${EO} infinite}`,
  // held: kicking, flailing, receipt and tag flapping hard (loops)
  `.pcm[data-state=held] .pc-leg-l,.pcm[data-state=held] .pc-leg-r{animation:pc-kick .6s ease-in-out infinite}.pcm[data-state=held] .pc-leg-r{animation-delay:-.3s}`,
  `.pcm[data-state=held] .pc-flail-l,.pcm[data-state=held] .pc-flail-r{animation:pc-flail .6s ease-in-out infinite}.pcm[data-state=held] .pc-flail-r{animation-delay:-.3s}`,
  `.pcm[data-state=held] .pc-paper{animation:pc-flap .3s ease-in-out infinite}`,
  `.pcm[data-state=held] .pc-tag{animation:pc-whirl .6s ease-in-out infinite}`,
  `.pcm[data-state=held] .pc-upper{animation:pc-jiggle .4s linear infinite}`,
  // falling: fast buffeting, receipt and tag streaming up, speed lines (loops)
  `.pcm[data-state=falling] .pc-out-l,.pcm[data-state=falling] .pc-out-r{animation:pc-buffet .2s ease-in-out infinite}.pcm[data-state=falling] .pc-out-r{animation-delay:-.1s}`,
  `.pcm[data-state=falling] .pc-leg-l{animation:pc-dangle-l .3s ease-in-out infinite}.pcm[data-state=falling] .pc-leg-r{animation:pc-dangle-r .3s ease-in-out -.15s infinite}`,
  `.pcm[data-state=falling] .pc-paper{animation:pc-stream .2s linear infinite}`,
  `.pcm[data-state=falling] .pc-tag{animation:pc-tagwhip .2s ease-in-out infinite}`,
  `.pcm[data-state=falling] .pc-upper{animation:pc-jiggle .2s linear infinite}`,
  `.pcm[data-state=falling] .pc-sl{animation:pc-speed .4s linear infinite;animation-delay:calc(var(--d) * -1)}`,
  // landed: squash on impact, spiral eyes, sparkles and dust, then back to normal eyes (once, 0.8s)
  `.pcm[data-state=landed] .pc-rig{animation:pc-land .8s ${EO} both}`,
  `.pcm[data-state=landed] .pc-paper-pos{animation:pc-jolt .8s ${EO} both}`,
  `.pcm[data-state=landed] .pc-spin{animation:pc-spin .8s ${EO} both}.pcm[data-state=landed] .pc-spin-r{animation-name:pc-spin-r}`,
  `.pcm[data-state=landed] .pc-eyes-dizzy{animation:pc-dizzy .8s linear both}.pcm[data-state=landed] .pc-eyes{animation:pc-unblur .8s linear both}`,
  `.pcm[data-state=landed] .pc-star{animation:pc-star .8s ${EO} both;animation-delay:var(--d)}`,
  `.pcm[data-state=landed] .pc-dust{animation:pc-dust .7s ${EO} both}`,
  // still / reduced motion: hold each state's key pose
  `.pcm[data-still=true] *{animation:none!important}`,
  `.pcm[data-still=true][data-state=confused] .pc-upper{transform:rotate(-6deg)}`,
  `@media (prefers-reduced-motion:reduce){.pcm *{animation:none!important}.pcm[data-state=confused] .pc-upper{transform:rotate(-6deg)}.pcm[data-state=thinking] .pc-dot{animation:pc-dot 1.8s ease-in-out infinite!important}}`,
].join("\n");

/** Full artboard (with receipt) vs compact crop (no receipt) for small sizes like a 30px sidebar. */
export const VIEWBOX = { full: [0, -40, 240, 350], compact: [-6, 100, 252, 214] } as const;

export function prueSvg(opts: { state?: PrueState; size?: number; loop?: boolean; still?: boolean; compact?: boolean; id?: string; title?: string; css?: boolean } = {}) {
  const s = opts.state ?? "idle", size = opts.size ?? 120, p = opts.id ?? "pc" + Math.random().toString(36).slice(2, 8);
  const vb = opts.compact ? VIEWBOX.compact : VIEWBOX.full;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="pcm" viewBox="${vb.join(" ")}" width="${size}" height="${Math.round(size * vb[3] / vb[2])}" data-state="${s}" data-loop="${!!opts.loop}" data-still="${!!opts.still}" data-compact="${!!opts.compact}" role="img" aria-label="${opts.title ?? "Prue, Precedent's assistant"}">${opts.css ? `<style>${PRUE_CSS}</style>` : ""}${prueDefs(p)}${prueBody(p)}</svg>`;
}
