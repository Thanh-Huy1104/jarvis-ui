/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
      colors: {
        // Custom neutral palette matching Claude's warm dark theme feel
        claude: {
          bg: '#FAF9F6', // Current light bg
          dark: '#1F1F1F', // Dark bg
          darker: '#131316', // Sidebar dark
          panel: '#2A2A2A', // Cards/Panels dark
        }
      }
    },
  },
  plugins: [],
}
