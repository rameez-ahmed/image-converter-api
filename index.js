const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const { convert } = require('heic-convert'); // for HEIC input support

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

    const file = req.files[0]; // process first file (add loop later for batch)
    const { format = 'webp', quality = 80, width, keepOriginalSize, compressOnly } = req.body;

    let buffer = file.buffer;
    let inputExt = file.originalname.split('.').pop().toLowerCase();

    // Handle HEIC/HEIF input with heic-convert
    if (['heic', 'heif'].includes(inputExt)) {
      try {
        buffer = await convert({
          buffer: file.buffer,
          format: 'PNG', // convert to PNG first (safe for sharp)
          quality: 1 // max quality for intermediate step
        });
        inputExt = 'png';
      } catch (heicErr) {
        console.error('HEIC conversion failed:', heicErr.message);
        return res.status(400).send('Failed to process HEIC file. Try converting to JPG/PNG first.');
      }
    }

    let image = sharp(buffer);

    // Determine final output format
    let outputFormat = format;
    if (compressOnly === 'true' || format === 'original') {
      const supported = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif'];
      outputFormat = supported.includes(inputExt) ? inputExt : 'webp';
    }

    // Resize if provided and not keepOriginalSize
    if (width && width !== '' && keepOriginalSize !== 'true') {
      image = image.resize(parseInt(width), null, { fit: 'inside', withoutEnlargement: true });
    }

    // Final conversion
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
