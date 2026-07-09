/**
 * Validated data-viz palette (light + dark are separately selected steps of the
 * same hues, not an automatic flip). Series hues are assigned in this fixed
 * order — never cycled or generated.
 */
export interface VizTheme {
  surface: string;
  page: string;
  textPrimary: string;
  textSecondary: string;
  muted: string;
  grid: string;
  axis: string;
  border: string;
  series: string[];
  /** One-hue ramp for magnitude (heatmaps); low → recedes toward surface. */
  sequential: string[];
  good: string;
  bad: string;
}

export const light: VizTheme = {
  surface: "#fcfcfb",
  page: "#f9f9f7",
  textPrimary: "#0b0b0b",
  textSecondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  border: "rgba(11,11,11,0.10)",
  series: [
    "#2a78d6", // blue
    "#1baf7a", // aqua
    "#eda100", // yellow
    "#008300", // green
    "#4a3aa7", // violet
    "#e34948", // red
    "#e87ba4", // magenta
    "#eb6834", // orange
  ],
  sequential: [
    "#cde2fb",
    "#9ec5f4",
    "#6da7ec",
    "#3987e5",
    "#256abf",
    "#184f95",
    "#0d366b",
  ],
  good: "#006300",
  bad: "#d03b3b",
};

export const dark: VizTheme = {
  surface: "#1a1a19",
  page: "#0d0d0d",
  textPrimary: "#ffffff",
  textSecondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  border: "rgba(255,255,255,0.10)",
  series: [
    "#3987e5",
    "#199e70",
    "#c98500",
    "#008300",
    "#9085e9",
    "#e66767",
    "#d55181",
    "#d95926",
  ],
  // Low values sit near the dark surface; high values brighten.
  sequential: [
    "#0d366b",
    "#184f95",
    "#256abf",
    "#3987e5",
    "#6da7ec",
    "#9ec5f4",
    "#cde2fb",
  ],
  good: "#0ca30c",
  bad: "#e66767",
};

export function getTheme(isDark: boolean): VizTheme {
  return isDark ? dark : light;
}
