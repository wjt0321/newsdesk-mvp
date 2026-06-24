/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F7F4EF",
        surface: "#FFFFFF",
        "surface-subtle": "#F2EFE8",
        "text-primary": "#161616",
        "text-secondary": "#5F6368",
        "text-tertiary": "#8B8F96",
        border: "#DED8CC",
        accent: "#2563EB",
        amber: "#D89A2B",
        danger: "#C2410C",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "Microsoft YaHei UI",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
}
