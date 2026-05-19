// ── Cart ────────────────────────────────────────────────────
const Cart = (() => {
  const STORAGE_KEY = 'dynamic_store_cart';

  let items = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function add(productId) {
    items[productId] = (items[productId] || 0) + 1;
    save(); CartUI.update();
  }

  function remove(productId) {
    delete items[productId];
    save(); CartUI.update();
  }

  function updateQty(productId, qty) {
    if (qty <= 0) remove(productId);
    else { items[productId] = qty; save(); CartUI.update(); }
  }

  function clear() { items = {}; save(); CartUI.update(); }

  function count() {
    return Object.values(items).reduce((a, b) => a + b, 0);
  }

  function total() {
    return Object.entries(items).reduce((sum, [id, qty]) => {
      const p = getProductById(Number(id));
      return p ? sum + p.price * qty : sum;
    }, 0);
  }

  function toLineItems() {
    return Object.entries(items)
      .filter(([id]) => getProductById(Number(id)))
      .map(([id, qty]) => {
        const p = getProductById(Number(id));
        return { product_id: p.id, product_name: p.name, price: p.price, quantity: qty, emoji: p.emoji, category: p.category };
      });
  }

  function getQty(productId) { return items[productId] || 0; }

  return { add, remove, updateQty, clear, count, total, toLineItems, getQty };
})();


// ── Cart UI ─────────────────────────────────────────────────
const CartUI = (() => {
  function update() {
    const count = Cart.count();

    // Update all badges on page
    document.querySelectorAll('.cart-badge').forEach(badge => {
      badge.textContent = count;
      badge.classList.toggle('visible', count > 0);
    });

    // Re-render cart items if on cart page
    if (typeof renderCartPage === 'function') renderCartPage();
  }

  return { update };
})();
