module.exports = {
  proxy: 'http://localhost:5001',
  files: ['public/**/*.{html,css,js,png,svg}', 'templates/**/*.html'],
  port: 5000,
  open: false,
  reloadDelay: 1000, // Give time for nodemon to restart the server
  reloadDebounce: 500, // Prevent rapid reloads
};
