const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, '..', 'uploads');

if (fs.existsSync(uploadDir)) {
  fs.readdirSync(uploadDir).forEach((file) => {
    if (file !== '.gitkeep') {
      fs.unlinkSync(path.join(uploadDir, file));
    }
  });
  console.log('[CLEAN] uploads directory cleaned, .gitkeep preserved.');
} else {
  console.log('[CLEAN] uploads directory does not exist.');
}
