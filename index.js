const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Track active requests
let activeRequests = 0;

// Log every request
app.use((req, res, next) => {
  activeRequests++;
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] Request started — Active: ${activeRequests}`);

  res.on('finish', () => {
    activeRequests--;
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] Request finished in ${duration}ms — Active: ${activeRequests} — Status: ${res.statusCode}`);

    if (duration > 15000) console.warn(`⚠️ SLOW REQUEST: ${duration}ms`);
    if (activeRequests > 10) console.warn(`⚠️ HIGH LOAD: ${activeRequests} concurrent requests`);
  });

  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 60 * 1024 * 1024,
    files: 20
  }
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

// Health check — visit /status in browser to see server stats
app.get('/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'ok',
    activeRequests,
    memory: {
      used: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(mem.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(mem.rss / 1024 / 1024) + 'MB'
    },
    uptime: Math.round(process.uptime()) + ' seconds'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
