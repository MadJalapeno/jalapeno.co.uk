/** @type {import('tailwindcss').Config} */
module.exports = {

  // https://uicolors.app/create
  theme: {
    extend: {
      colors: {
        'fire': {
          '50': '#fff8ec',
          '100': '#ffefd3',
          '200': '#ffdca7',
          '300': '#ffc16f',
          '400': '#ff9b35',
          '500': '#ff7e0e',
          '600': '#f26104',
          '700': '#c94805',
          '800': '#aa3d0e',
          '900': '#80310e',
          '950': '#451605',
        },
        'bahama': {
          '50': '#f1f9fe',
          '100': '#e2f2fc',
          '200': '#bee4f9',
          '300': '#84cff5',
          '400': '#43b7ed',
          '500': '#1b9edc',
          '600': '#0d7ebc',
          '700': '#0c6497',
          '800': '#0e567e',
          '900': '#124868',
          '950': '#0c2d45',
        },
      }
    },
  },

  plugins: [require("@tailwindcss/typography")],

  content: ["./src/**/*.{njk,md}", "./src/**/*.svg",],

}

