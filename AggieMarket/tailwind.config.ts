import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "sans-serif"],
        body: ['"DM Sans"', "sans-serif"],
      },
      colors: {
        border: "#E0E0E0",
        input: "#E0E0E0",
        ring: "#8C0B42",
        background: "#F5F5F5",
        foreground: "#212121",
        primary: {
          DEFAULT: "#8C0B42",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F5F5F5",
          foreground: "#212121",
        },
        destructive: {
          DEFAULT: "#d32f2f",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F5F5F5",
          foreground: "#757575",
        },
        accent: {
          DEFAULT: "#F5F5F5",
          foreground: "#212121",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#212121",
        },
        crimson: {
          50: "#FDF2F6",
          100: "#FCE4ED",
          200: "#F9C9DB",
          500: "#8C0B42",
          600: "#750938",
          700: "#5E072D",
          900: "#380418",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
      },
    },
  },
  plugins: [],
} satisfies Config;
