const express = require('express');
const cors    = require('cors');

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'] }));
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
