/**
 * Design tokens from wireframe CSS variables.
 * --c-white, --c-bg, --c-border, --c-mid, --c-dark, --c-ink
 */
export const colors = {
  white: "#FFFFFF",
  bg: "#F5F5F5",
  border: "#E0E0E0",
  mid: "#BDBDBD",
  dark: "#757575",
  ink: "#212121",
} as const;

export type Colors = typeof colors;
