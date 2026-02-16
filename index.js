const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
app.use(cors());

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

app.post('/convert', upload.array('images', 20), async (req, res) => {
  try {
    const { format = 'webp', quality = 80, width, height } = req.body;
    
    const file = req.files[0];
    let pipeline = sharp(file.buffer);

    if (width || height) {
      pipeline = pipeline.resize(
        width ? parseInt(width) : null, 
        height ? parseInt(height) : null,
        { fit: 'inside', withoutEnlargement: true }
      );
    }

    const outputFormat = format.toLowerCase();
    const buffer = await pipeline
      .toFormat(outputFormat, { quality: parseInt(quality) })
      .toBuffer();

    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    
    res.set({
      'Content-Type': `image/${outputFormat}`,
      'Content-Disposition': `attachment; filename="converted.${ext}"`
    });
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing image');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Converter API running on ${PORT}`));
