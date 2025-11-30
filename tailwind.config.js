/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",   // includes ALL TS + TSX files
  ],
  theme: {
    extend: {
      colors: {
        // Use a NORMAL color name instead of bg-bg-primary
        primary: "#0f172a",    // Change to the actual color you want
      },
    },
  },
  plugins: [],
};
