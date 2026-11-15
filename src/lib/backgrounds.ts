// Original scenes drawn in code: no stock photos, no downloads, tiny size.
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const stars = (n: number, maxY: number, seed = 0) =>
  Array.from({ length: n }, (_, i) =>
    `<circle cx="${(rnd(i + seed) * 520).toFixed(0)}" cy="${(rnd(i * 3 + seed + 9) * maxY).toFixed(0)}" r="${(0.4 + rnd(i + seed + 5) * 1.1).toFixed(1)}" fill="#fff" opacity="${(0.3 + rnd(i + seed + 2) * 0.65).toFixed(2)}"/>`
  ).join("");
const blur = (id: string, d: number) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${d}"/></filter>`;
const grad = (id: string, stops: [number, string][], vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360" preserveAspectRatio="xMidYMid slice">${body}</svg>`;

const SCENES: { id: string; name: string; art: string }[] = [
  {
    id: "forest", name: "Golden Forest",
    art: svg(`<defs>${grad("a", [[0, "#ffe9a8"], [0.5, "#e3a23c"], [1, "#26351d"]])}
      <radialGradient id="b" cx=".64" cy=".5" r=".45"><stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></radialGradient>${blur("f", 3)}</defs>
      <rect width="520" height="360" fill="url(#a)"/><rect width="520" height="360" fill="url(#b)"/>
      <g fill="#fff6d0" opacity=".17" filter="url(#f)"><polygon points="332,170 120,0 190,0"/><polygon points="332,170 260,0 330,0"/><polygon points="332,170 400,0 470,0"/><polygon points="332,170 520,50 520,130"/></g>
      <g fill="#16200f"><rect x="26" width="28" height="360" opacity=".93"/><rect x="118" width="14" height="360" opacity=".72"/><rect x="204" y="30" width="9" height="330" opacity=".5"/><rect x="414" y="20" width="18" height="340" opacity=".8"/><rect x="486" width="34" height="360" opacity=".95"/></g>
      <path d="M0 305 Q130 275 260 303 T520 292 V360H0Z" fill="#0f1a0b"/>`),
  },
  {
    id: "mist", name: "Misty Hills",
    art: svg(`<defs>${grad("a", [[0, "#e6f1ea"], [1, "#8fb79d"]])}${blur("f", 9)}</defs>
      <rect width="520" height="360" fill="url(#a)"/>
      <path d="M0 215 C90 165 170 200 260 168 S430 150 520 188 V360H0Z" fill="#7da58a" opacity=".6"/>
      <ellipse cx="150" cy="238" rx="230" ry="22" fill="#fff" opacity=".45" filter="url(#f)"/>
      <path d="M0 262 C100 220 200 252 300 215 S450 222 520 246 V360H0Z" fill="#5b8a6c" opacity=".85"/>
      <ellipse cx="390" cy="282" rx="220" ry="20" fill="#fff" opacity=".4" filter="url(#f)"/>
      <path d="M0 308 C120 272 220 302 330 276 S470 282 520 296 V360H0Z" fill="#2f5a43"/>`),
  },
  {
    id: "aurora", name: "Aurora",
    art: svg(`<defs>${grad("a", [[0, "#040a1c"], [1, "#0b2b3b"]])}${grad("g", [[0, "#3dffb0"], [1, "#3dffb000"]])}${grad("p", [[0, "#a070ff"], [1, "#a070ff00"]])}${blur("f", 14)}</defs>
      <rect width="520" height="360" fill="url(#a)"/>${stars(70, 200)}
      <path d="M-20 130 C120 40 240 190 380 80 S520 120 560 70 V200 C440 240 300 120 180 225 S40 195 -20 235Z" fill="url(#g)" opacity=".85" filter="url(#f)"/>
      <path d="M-20 170 C110 110 230 230 350 140 S500 170 560 120 V240 C430 270 290 170 170 255 S30 230 -20 270Z" fill="url(#p)" opacity=".55" filter="url(#f)"/>
      <path d="M0 332 L70 272 L130 312 L210 252 L290 317 L370 267 L450 314 L520 282 V360H0Z" fill="#03060f"/>`),
  },
  {
    id: "dusk", name: "Ocean Dusk",
    art: svg(`<defs>${grad("a", [[0, "#ffb48a"], [0.5, "#b565c8"], [1, "#1a1f4d"]])}${grad("s", [[0, "#3a3170"], [1, "#0a0f2c"]])}
      <radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe2b0" stop-opacity=".9"/><stop offset="1" stop-color="#ffe2b0" stop-opacity="0"/></radialGradient></defs>
      <rect width="520" height="360" fill="url(#a)"/><circle cx="260" cy="205" r="120" fill="url(#g)"/>
      <circle cx="260" cy="205" r="44" fill="#ffe6bd"/><rect y="215" width="520" height="145" fill="url(#s)"/>
      <g stroke="#ffd9a8" stroke-linecap="round" opacity=".55"><path d="M225 228h70" stroke-width="3"/><path d="M235 242h50" stroke-width="3"/><path d="M243 257h34" stroke-width="2.5"/><path d="M250 273h20" stroke-width="2"/></g>`),
  },
  {
    id: "dunes", name: "Desert Dunes",
    art: svg(`<defs>${grad("a", [[0, "#ffe0b0"], [1, "#f1a45c"]])}${blur("f", 6)}</defs>
      <rect width="520" height="360" fill="url(#a)"/><circle cx="400" cy="110" r="38" fill="#fff4d8" opacity=".85" filter="url(#f)"/>
      <path d="M0 230 C110 170 210 240 330 200 S470 190 520 210 V360H0Z" fill="#eba35f"/>
      <path d="M0 270 C130 215 230 285 360 245 S480 245 520 260 V360H0Z" fill="#cf7b43"/>
      <path d="M0 270 C130 215 230 285 360 245 L330 360H0Z" fill="#a85a30" opacity=".35"/>
      <path d="M0 325 C140 290 260 345 380 312 S490 310 520 322 V360H0Z" fill="#8c4527"/>`),
  },
  {
    id: "alpine", name: "Alpine Night",
    art: svg(`<defs>${grad("a", [[0, "#0a1330"], [0.6, "#1b3157"], [1, "#41507a"]])}${blur("f", 8)}</defs>
      <rect width="520" height="360" fill="url(#a)"/>${stars(80, 230, 4)}
      <circle cx="390" cy="86" r="46" fill="#cfd8ff" opacity=".35" filter="url(#f)"/><circle cx="390" cy="86" r="21" fill="#f6f3ff"/>
      <path d="M0 250 L90 175 L170 245 L260 150 L350 250 L440 185 L520 240 V360H0Z" fill="#26375e"/>
      <path d="M0 290 L110 215 L200 285 L300 205 L400 290 L470 245 L520 280 V360H0Z" fill="#141f3f"/>
      <path d="M0 325 L120 270 L230 322 L340 275 L440 325 L520 300 V360H0Z" fill="#070c1e"/>`),
  },
  {
    id: "bokeh", name: "Blush Bokeh",
    art: svg(`<defs>${grad("a", [[0, "#ffd1dc"], [0.55, "#c6a1ff"], [1, "#6c7cff"]], false)}${blur("f", 7)}</defs>
      <rect width="520" height="360" fill="url(#a)"/>
      <g filter="url(#f)"><circle cx="80" cy="90" r="46" fill="#fff" opacity=".35"/><circle cx="190" cy="250" r="64" fill="#ffb3d1" opacity=".4"/><circle cx="320" cy="80" r="38" fill="#fff" opacity=".3"/><circle cx="430" cy="210" r="70" fill="#8fd0ff" opacity=".35"/><circle cx="480" cy="60" r="30" fill="#ffe3a8" opacity=".4"/><circle cx="40" cy="300" r="40" fill="#fff" opacity=".25"/></g>`),
  },
  {
    id: "space", name: "Deep Space",
    art: svg(`<defs>${blur("f", 28)}</defs><rect width="520" height="360" fill="#05060f"/>
      <g filter="url(#f)"><ellipse cx="150" cy="110" rx="150" ry="70" fill="#5b3cc4" opacity=".5"/><ellipse cx="380" cy="250" rx="170" ry="80" fill="#1f8fff" opacity=".4"/><ellipse cx="430" cy="90" rx="90" ry="50" fill="#ff4f9a" opacity=".35"/></g>${stars(130, 360, 7)}`),
  },
];

export const BACKGROUNDS = SCENES.map(({ id, name }) => ({ id, name }));
const cache = new Map<string, string>();
export function bgUrl(id: string): string {
  const s = SCENES.find((x) => x.id === id);
  if (!s) return "";
  if (!cache.has(id)) cache.set(id, `url("data:image/svg+xml;utf8,${encodeURIComponent(s.art)}")`);
  return cache.get(id)!;
}

/** Downscales a user's own photo so it stays small in storage. */
export function loadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("bad image"));
      img.onload = () => {
        const k = Math.min(1, 1100 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(r.result);
    };
    r.readAsDataURL(file);
  });
}
