// Deterministic tag colors. The color is derived from the tag NAME, so the same
// tag always renders in the same color everywhere it appears (across all pages).
// The palette leads with brass; other tags fall on the remaining muted colors.
const PALETTE = [
  { background: "#F3E4CC", color: "#6E4E22", borderColor: "#E3CDA6" }, // brass
  { background: "#E3ECE0", color: "#3D5A3F", borderColor: "#CBDCC7" }, // sage
  { background: "#DCE6EE", color: "#2F4A63", borderColor: "#C3D6E4" }, // slate blue
  { background: "#F0DBD5", color: "#7A3B2E", borderColor: "#E4C6BD" }, // terracotta
  { background: "#E7E0EE", color: "#4E3A63", borderColor: "#D6CBE4" }, // plum
  { background: "#D8E9E6", color: "#2E5852", borderColor: "#BFDDD7" }, // teal
];

export interface TagColor {
  background: string;
  color: string;
  borderColor: string;
}

export function tagColor(name: string): TagColor {
  const s = (name || "").toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
