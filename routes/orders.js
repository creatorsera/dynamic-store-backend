const express = require('express');
const router  = express.Router();
const { nanoid } = require('nanoid');
const { saveOrderTx, getOrder, getOrderItems, getAllOrders, updateStatus } = require('../database');

router.post('/', async (req, res) => {
  const { name, phone, address, city, payment, notes, items } = req.body;

  const missing = [];
  if (!name?.trim())    missing.push('name');
  if (!phone?.trim())   missing.push('phone');
  if (!address?.trim()) missing.push('address');
  if (!city?.trim())    missing.push('city');
  if (!payment?.trim()) missing.push('payment');
  if (!items?.length)   missing.push('items');
  if (missing.length)   return res.status(400).json({ error: 'Missing: ' + missing.join(', ') });

  const total     = items.reduce((s,i) => s + (i.price * i.quantity), 0);
  const order_ref = `ORD-${nanoid(8).toUpperCase()}`;

  try {
    await saveOrderTx(
      { order_ref, name: name.trim(), phone: phone.trim(), address: address.trim(),
        city: city.trim(), payment, notes: notes?.trim()||'', total },
      items.map(i => ({
        product_id: i.product_id, product_name: i.product_name,
        price: i.price, quantity: i.quantity,
        color: i.color||'', size: i.size||'',
      }))
    );
  } catch (err) {
    console.error('Order save error:', err.message);
    return res.status(500).json({ error: 'Failed to save order' });
  }

  const fmt = n => `Rs. ${Number(n).toLocaleString('en-PK')}`;
  const lines = items.map(i => {
    const v = [i.color, i.size].filter(Boolean).join(' / ');
    return `• ${i.product_name}${v?` (${v})`:''} ×${i.quantity} = ${fmt(i.price*i.quantity)}`;
  }).join('\n');

  const msg = [
    `🛒 *New Order — ${order_ref}*`, '',
    `*Customer*`,
    `Name: ${name.trim()}`, `Phone: ${phone.trim()}`,
    `City: ${city.trim()}`, `Address: ${address.trim()}`, '',
    `*Items*`, lines, '',
    `*Total: ${fmt(total)}*`,
    `Payment: ${payment}`,
    notes?.trim() ? `Notes: ${notes.trim()}` : null,
  ].filter(l=>l!==null).join('\n');

  res.json({ success:true, order_ref, wa_url: `https://wa.me/${process.env.WA_NUMBER}?text=${encodeURIComponent(msg)}` });
});

router.get('/', async (req, res) => {
  try { res.json({ orders: await getAllOrders.all() }); }
  catch { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

router.get('/:ref', async (req, res) => {
  try {
    const order = await getOrder.get(req.params.ref);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ order, items: await getOrderItems.all(req.params.ref) });
  } catch { res.status(500).json({ error: 'Failed to fetch order' }); }
});

router.patch('/:ref/status', async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending','confirmed','shipped','delivered','cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await updateStatus.run(status, req.params.ref);
    res.json({ success:true, status });
  } catch { res.status(500).json({ error: 'Failed to update' }); }
});

module.exports = router;
