const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
app.use(cors());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max per file
});

app.post('/convert', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded');
    }

    const file = req.files[0]; // Process first file (add loop later for batch)
    const { format = 'webp', quality = 80, width, keepOriginalSize, compressOnly } = req.body;

    let image = sharp(file.buffer);

    // Determine output format
    let outputFormat = format;
    if (compressOnly === 'true' || format === 'original') {
      // Keep original format when "Compress only" is checked
      const inputExt = file.originalname.split('.').pop().toLowerCase();
      const supportedOutput = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif'];
      outputFormat = supportedOutput.includes(inputExt) ? inputExt : 'webp';
    }

    // Resize only if width is provided and "keep original size" is NOT checked
    if (width && width !== '' && keepOriginalSize !== 'true') {
      image = image.resize(parseInt(width), null, { fit: 'inside', withoutEnlargement: true });
    }

    // Convert to the chosen format with quality
    const outputBuffer = await image
      .toFormat(outputFormat, { quality: parseInt(quality) })
      .toBuffer();

    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;

    res.set({
      'Content-Type': `image/${outputFormat}`,
      'Content-Disposition': `attachment; filename="converted.${ext}"`
    });

    res.send(outputBuffer);
  } catch (err) {
    console.error('Processing error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).send('Error processing image');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
