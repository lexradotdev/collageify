/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs"],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        primary: "#1DB954"
      }
    },
  },
  safelist: [
    'btn-primary',
    'btn-selected',
  ],
  plugins: [],
};
