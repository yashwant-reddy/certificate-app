const express = require('express');
const clearUploads = require('../utils/clearUploads');
const router = express.Router();

router.post('/', (req, res) => {
  const deletedFiles = clearUploads();
  res.send(
    `<h2>Cleared ${deletedFiles.length} uploaded file(s):<br>${deletedFiles.join('<br>')}</h2>`
  );
});

module.exports = router;
