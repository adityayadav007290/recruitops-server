const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SEED_FILE = path.join(__dirname, 'seed.json');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set. Set it in your hosting provider\'s environment settings.');
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
let appDataCol, resumesCol;

async function connectDB() {
  await client.connect();
  const db = client.db('recruitops');
  appDataCol = db.collection('appdata');
  resumesCol = db.collection('resumes');
  console.log('Connected to MongoDB.');

  // Seed the shared dataset on first run.
  const existing = await appDataCol.findOne({ _id: 'main' });
  if (!existing) {
    const seed = fs.existsSync(SEED_FILE) ? JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8')) : {};
    await appDataCol.insertOne({ _id: 'main', ...seed });
    console.log('Seeded initial data into MongoDB.');
  }
}

// ---- Resume uploads: stored as base64 inside MongoDB (no local disk needed) ----
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];
const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.rtf': 'application/rtf',
  '.txt': 'text/plain'
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return cb(new Error('Unsupported file type. Use PDF, DOC, DOCX, RTF or TXT.'));
    cb(null, true);
  }
});

app.post('/api/resumes/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received.' });
    const candidateId = (req.body.candidateId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
    const ext = path.extname(req.file.originalname) || '';
    const safeBase = path.basename(req.file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    const filename = `${candidateId}_${Date.now()}_${safeBase}${ext}`;
    await resumesCol.insertOne({
      filename,
      candidateId,
      contentType: MIME_BY_EXT[ext.toLowerCase()] || 'application/octet-stream',
      data: req.file.buffer.toString('base64'),
      uploadedAt: new Date()
    });
    res.json({ ok: true, filename, url: `/resumes/${filename}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Upload failed.' });
  }
});

app.get('/resumes/:filename', async (req, res) => {
  try {
    const doc = await resumesCol.findOne({ filename: req.params.filename });
    if (!doc) return res.status(404).send('Not found.');
    res.setHeader('Content-Type', doc.contentType || 'application/octet-stream');
    res.send(Buffer.from(doc.data, 'base64'));
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load file.');
  }
});

app.delete('/api/resumes/:filename', async (req, res) => {
  try {
    await resumesCol.deleteOne({ filename: req.params.filename });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
});

// Serve the app itself at the root address, so visiting the server's
// public URL directly opens RecruitOps (no separate file needed).
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'recruitops.html'));
});

// ---- Shared app data (clients, requirements, candidates, pipeline, etc.) ----
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/data', async (req, res) => {
  try {
    const doc = await appDataCol.findOne({ _id: 'main' });
    if (!doc) return res.status(404).json({ error: 'No data found.' });
    const { _id, ...rest } = doc;
    res.json(rest);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to read data.' });
  }
});

app.put('/api/data', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid payload.' });
    }
    await appDataCol.replaceOne({ _id: 'main' }, { _id: 'main', ...req.body }, { upsert: true });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save data.' });
  }
});

const PORT = process.env.PORT || 4000;
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`RecruitOps server running on port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error('Failed to connect to MongoDB:', e.message);
    process.exit(1);
  });
