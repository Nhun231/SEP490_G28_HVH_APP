/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#42A4F5',
        secondary: {
          50: '#64B5F6',
          100: '#90CAF9',
        },
        light: {
          50: '#BBDEFB',
          100: '#E3F2FD',
        },
        dark: '#0D47A1',
      },
    },
  },
  plugins: [],
}