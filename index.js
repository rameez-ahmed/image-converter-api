const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
app.use(cors());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.post('/convert', upload.array('images', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send('No files uploaded');
    }

    const { format = 'webp', quality = 80, width, keepOriginalSize, compressOnly } = req.body;
    const results = [];

    for (const file of req.files) {
      let image = sharp(file.buffer);
      const inputExt = file.originalname.split('.').pop().toLowerCase();

      let outputFormat = format;
      if (compressOnly === 'true' || format === 'original') {
        const supported = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif'];
        outputFormat = supported.includes(inputExt) ? inputExt : 'webp';
      }

      if (width && width !== '' && keepOriginalSize !== 'true') {
        image = image.resize(parseInt(width), null, { fit: 'inside', withoutEnlargement: true });
      }

      const outputBuffer = await image
        .toFormat(outputFormat, { quality: parseInt(quality) })
        .toBuffer();

      const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
      const originalName = file.originalname.replace(/\.[^.]+$/, '');
      results.push({ buffer: outputBuffer.toString('base64'), ext, originalName });
    }

    res.json(results);

  } catch (err) {
    console.error('Processing error:', err.message);
    res.status(500).send('Error processing image');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
