/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        kwaxolo: {
          green: "#0f7c4a",
          gold: "#f4b53f",
          red: "#d83731",
          blue: "#1e3a8a",
          cream: "#faf6ef",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
