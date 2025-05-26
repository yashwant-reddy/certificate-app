const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/upload", require("./routes/upload"));
app.use("/preview", require("./routes/preview"));
app.use("/clear-uploads", require("./routes/clearUploads"));

// Start server
app.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
});
