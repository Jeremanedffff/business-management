/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7fc",
          100: "#dceaf6",
          200: "#b9d4ec",
          300: "#8fb9e0",
          400: "#5a97ce",
          500: "#2E75B6",
          600: "#276199",
          700: "#1F4E79",
          800: "#183d5e",
          900: "#122c44",
        },
      },
    },
  },
  plugins: [],
}
