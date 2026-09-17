// Categorical palette — distinct hues, legible on the dark UI.
export const PALETTE = [
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#fb923c",
  "#22d3ee",
  "#4ade80",
  "#f87171",
  "#c084fc",
  "#facc15",
  "#2dd4bf",
];

export const colorAt = (i) => PALETTE[i % PALETTE.length];
