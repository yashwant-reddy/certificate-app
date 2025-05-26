module.exports = {
  proxy: "http://localhost:3000",
  files: [
    "public/**/*.{html,css,js,png,svg}",
    "templates/**/*.html",
    "routes/**/*.js",
  ],
  port: 4000,
  open: true,
  reloadDelay: 1000, // Delay reload after server restart
  reloadDebounce: 500, // Prevent rapid reloads
};
