/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- 1. Enables the dark mode toggle
  theme: {
    extend: {
      colors: {
        // <--- 2. Maps your CSS variables to Tailwind classes
        bg: {
          primary: 'var(--color-bg-primary)',     // usage: bg-bg-primary
          secondary: 'var(--color-bg-secondary)', // usage: bg-bg-secondary
        },
        text: {
          main: 'var(--color-text-main)',         // usage: text-text-main
          muted: 'var(--color-text-muted)',       // usage: text-text-muted
        },
        brand: {
          primary: 'var(--color-brand-primary)',  // usage: bg-brand-primary
          secondary: 'var(--color-brand-secondary)',
          accent: 'var(--color-brand-accent)',
        },
        zone: {
          weak: 'var(--color-zone-weak)',         // usage: bg-zone-weak
          average: 'var(--color-zone-average)',   // usage: text-zone-average
          fit: 'var(--color-zone-fit)',           // usage: border-zone-fit
        },
      },
    },
  },
  plugins: [],
}