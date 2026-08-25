const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DATA_FILE = path.join(__dirname, 'data.json');
const SEED_FILE = path.join(__dirname, 'seed.json');
const RESUMES_DIR = path.join(__dirname, 'resumes');

if (!fs.existsSync(RESUMES_DIR)) fs.mkdirSync(RESUMES_DIR);

// Serve uploaded resumes as static files, e.g. GET /resumes/cd_1_1699999999.pdf
app.use('/resumes', express.static(RESUMES_DIR));

// File upload setup — everything lands in the single RESUMES_DIR folder.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RESUMES_DIR),
  filename: (req, file, cb) => {
    const candidateId = (req.body.candidateId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
    const ext = path.extname(file.originalname) || '';
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    cb(null, `${candidateId}_${Date.now()}_${safeBase}${ext}`);
  }
});
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return cb(new Error('Unsupported file type. Use PDF, DOC, DOCX, RTF or TXT.'));
    cb(null, true);
  }
});

app.post('/api/resumes/upload', upload.single('resume'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received.' });
  res.json({ ok: true, filename: req.file.filename, url: `/resumes/${req.file.filename}` });
});

app.delete('/api/resumes/:filename', (req, res) => {
  const safe = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(RESUMES_DIR, safe);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') return res.status(500).json({ error: 'Failed to delete file.' });
    res.json({ ok: true });
  });
});

// Ensure a data file exists on first run, seeded with demo data.
function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, 'utf-8') : '{}';
    fs.writeFileSync(DATA_FILE, seed);
    console.log('Created data.json from seed.json');
  }
}
ensureDataFile();

// Simple write queue so concurrent saves don't corrupt the file.
let writing = Promise.resolve();
function writeData(obj) {
  writing = writing.then(() => fs.promises.writeFile(DATA_FILE, JSON.stringify(obj, null, 2)));
  return writing;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Returns the entire shared database.
app.get('/api/data', (req, res) => {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to read data.' });
  }
});

// Overwrites the entire shared database (last write wins).
app.put('/api/data', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid payload.' });
    }
    await writeData(req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save data.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`RecruitOps server running at http://localhost:${PORT}`);
  console.log('Other machines on your network can reach it at http://<this-computer-IP>:' + PORT);
});
