/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F7F4EF",
        surface: "#FFFFFF",
        "text-primary": "#161616",
        "text-secondary": "#5F6368",
        border: "#DED8CC",
        accent: "#2563EB",
        amber: "#D89A2B",
      },
    },
  },
  plugins: [],
}
