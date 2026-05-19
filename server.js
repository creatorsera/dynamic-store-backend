require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

const { router: authRouter } = require('./routes/auth');
app.use('/api/auth',     authRouter);
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/products', require('./routes/products'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', store: process.env.STORE_NAME || 'Dynamic Store' });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📦 Store: ${process.env.STORE_NAME || 'Dynamic Store'}`);
  console.log(`💬 WhatsApp: ${process.env.WA_NUMBER}\n`);
}).on('error', (err) => {
  console.error('Server failed to start:', err.message);
  process.exit(1);
});
