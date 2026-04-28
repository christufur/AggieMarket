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

  // Brand
  primary: "#8C0B42",
  primaryDark: "#5E072D",
  primaryDarkest: "#380418",
  primaryLight: "#FDF2F6",
  primaryBorder: "#F9C9DB",

  // Semantic
  success: "#2e7d32",
  successLight: "#E8F5E9",
  error: "#D32F2F",
  errorLight: "#FFF0F0",
} as const;

export type Colors = typeof colors;
