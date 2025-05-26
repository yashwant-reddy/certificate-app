const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.array("files"), (req, res) => {
  const files = req.files || [];
  let filesProcessed = 0;

  if (files.length === 0) {
    return res.send("No files uploaded.");
  }

  files.forEach((file) => {
    const results = [];
    const match = file.originalname.match(/\d+/); // Extract number from filename
    const reportNumber = match ? parseInt(match[0], 10) : "Unknown";

    fs.createReadStream(file.path)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
      })
      .on("end", () => {
        // Construct output data with corrected "file" key
        const outputData = [
          {
            file: `Readout Report ${reportNumber}.csv`, // <- updated here (plural Reports)
            [`Readout Report ${reportNumber} Content`]: results, // <- updated key with plural Reports + " Content"
          },
        ];

        const outputFileName = `Readout Report ${reportNumber}.json`; // <- file name with plural Reports
        const outputPath = path.join(
          __dirname,
          "..",
          "uploads",
          outputFileName
        );

        try {
          fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
          fs.unlinkSync(file.path); // Clean up temp upload
        } catch (err) {
          console.error(`Error processing ${file.originalname}:`, err);
        }

        filesProcessed++;

        if (filesProcessed === files.length) {
          const uploadedReports = files
            .map((f) => f.originalname.match(/\d+/))
            .filter(Boolean)
            .map((m) => parseInt(m[0], 10))
            .sort((a, b) => a - b);

          fs.writeFileSync(
            path.join(__dirname, "..", "uploads", "manifest.json"),
            JSON.stringify(uploadedReports, null, 2)
          );

          res.send(
            `<h2>All ${files.length} CSV files processed and saved.</h2>`
          );
        }
      });
  });
});

module.exports = router;
