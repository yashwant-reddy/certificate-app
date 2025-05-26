const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

router.post("/", (req, res) => {
  const uploadDir = path.join(__dirname, "..", "uploads");
  let deletedFiles = [];

  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      if (file === ".gitkeep" || !fs.lstatSync(filePath).isFile()) continue;

      fs.unlinkSync(filePath);
      deletedFiles.push(file);
    }
  }

  res.send(
    `<h2>Cleared ${
      deletedFiles.length
    } uploaded file(s):<br>${deletedFiles.join("<br>")}</h2>`
  );
});

module.exports = router;
