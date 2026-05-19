const express = require('express');
const cors    = require('cors');

const app = express();

app.options('*', cors());

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { router: authRouter } = require('../routes/auth');
app.use('/api/auth',     authRouter);
app.use('/api/orders',   require('../routes/orders'));
app.use('/api/products', require('../routes/products'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', store: process.env.STORE_NAME || 'Dynamic Store' });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

module.exports = app;
