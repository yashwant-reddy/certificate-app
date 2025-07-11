const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.post('/', (req, res) => {
  // Always use process.cwd() for uploads directory
  const uploadDir = path.join(process.cwd(), 'uploads');
  let deletedFiles = [];

  console.log(`[INFO] ClearUploads: Looking in directory: ${uploadDir}`);

  try {
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      console.log(`[INFO] Files found: ${files.join(', ')}`);

      for (const file of files) {
        const filePath = path.join(uploadDir, file);

        try {
          if (file === '.gitkeep' || !fs.lstatSync(filePath).isFile()) {
            console.log(`[SKIP] Not deleting: ${file}`);
            continue;
          }

          fs.unlinkSync(filePath);
          deletedFiles.push(file);
          console.log(`[DELETE] Deleted file: ${filePath}`);
        } catch (err) {
          console.error(`[ERROR] Deleting file: ${filePath}`, err);
        }
      }
    } else {
      console.warn(`[WARN] Upload directory does not exist: ${uploadDir}`);
    }
  } catch (err) {
    console.error('[ERROR] Reading uploads directory:', err);
  }

  res.send(
    `<h2>Cleared ${deletedFiles.length} uploaded file(s):<br>${deletedFiles.join('<br>')}</h2>`
  );
});

module.exports = router;
