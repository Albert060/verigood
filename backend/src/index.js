require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { registerEnumArrayParsers } = require('./config/database');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const organizationsRoutes = require('./routes/organizations');
const cambridgeRoutes = require('./routes/cambridge');
const lenguaRoutes = require('./routes/lengua');
const matematicasRoutes = require('./routes/matematicas');
const medioRoutes = require('./routes/medio');
const stripeRoutes = require('./routes/stripe');
const pdfRoutes = require('./routes/pdf');

const app = express();

// ── Security & basics ────────────────────────────────────────
app.use(helmet());
app.use(compression());

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Stripe webhook must receive raw body BEFORE json parse
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Rate limiting ────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Inténtalo más tarde.' },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 30,
  message: { error: 'Límite de llamadas a IA alcanzado. Espera un momento.' },
});

app.use('/api/', generalLimiter);
app.use('/api/cambridge', aiLimiter);
app.use('/api/lengua', aiLimiter);
app.use('/api/matematicas', aiLimiter);
app.use('/api/medio', aiLimiter);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── API routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', usersRoutes);
app.use('/api', organizationsRoutes);
app.use('/api/cambridge', cambridgeRoutes);
app.use('/api/lengua', lenguaRoutes);
app.use('/api/matematicas', matematicasRoutes);
app.use('/api/medio', medioRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/pdf', pdfRoutes);

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Error de archivo: ${err.message}` });
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3001;
registerEnumArrayParsers()
  .catch((err) => console.error('enum array parser registration failed:', err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 VeriGood API running on port ${PORT} [${process.env.NODE_ENV}]\n`);
    });
  });

module.exports = app;
