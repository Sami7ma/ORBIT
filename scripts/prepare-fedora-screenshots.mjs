import { readFile, writeFile } from "node:fs/promises";

// Bounds measured against the app window in the supplied screenshots.
// Keep the original captures intact; only the presentation SVGs are cropped.
const captures = [
  { name: "overview", x: 12, y: 0, width: 464, height: 185 },
  { name: "forecast", x: 16, y: 2, width: 485, height: 456 },
  { name: "settings", x: 0, y: 0, width: 512, height: 530 },
];

for (const { name, x, y, width, height } of captures) {
  const source = new URL(`../docs/screenshots/fedora-${name}.png`, import.meta.url);
  const png = await readFile(source);
  const sourceWidth = png.readUInt32BE(16);
  const sourceHeight = png.readUInt32BE(20);
  if (x + width > sourceWidth || y + height > sourceHeight) {
    throw new Error(`Crop exceeds the ${name} screenshot bounds`);
  }

  // A one-pixel inset discards edge pixels already blended with the wallpaper.
  // The radius follows the app's 22px shell, inset by the same amount.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><clipPath id="window"><rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="21"/></clipPath></defs>
  <image x="${-x}" y="${-y}" width="${sourceWidth}" height="${sourceHeight}" clip-path="url(#window)" xlink:href="data:image/png;base64,${png.toString("base64")}"/>
</svg>
`;
  await writeFile(new URL(`../docs/screenshots/fedora-${name}-rounded.svg`, import.meta.url), svg);
}
