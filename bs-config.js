module.exports = {
  proxy: 'http://localhost:3000',
  files: ['public/**/*.{html,css,js,png,svg}', 'templates/**/*.html'],
  port: 4000,
  open: true,
  reloadDelay: 1000, // Give time for nodemon to restart the server
  reloadDebounce: 500, // Prevent rapid reloads
};
