/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/typography")],

 

  content: ["./src/**/*.{njk,md}", "./src/**/*.svg",],

}

