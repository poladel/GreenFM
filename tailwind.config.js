/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs', // Scan all EJS files in views
    './public/js/**/*.js' // Scan JS files if they manipulate classes dynamically
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('tailwind-scrollbar-hide') // Include your plugin if needed
  ],
}