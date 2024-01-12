/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography"), require("daisyui")],

  daisyui: {
    themes: ["light", "dark", "bumblebee", "lemonade"],
  },

  content: ["./src/**/*.{njk,md}", "./src/**/*.svg",],

}

