import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        void: "#0B0E11",
        panel: "#12171C",
        "panel-raised": "#171D24",
        line: "#232B33",
        ink: "#E8ECEF",
        "ink-dim": "#8B95A1",
        bull: "#2FBF71",
        bear: "#E5484D",
        amber: "#D4A24E",
        hold: "#5B6672",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};

export default config;
