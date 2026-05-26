const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, nextId } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình multer upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'images', 'products');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'cosmetic_shop_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const requireLogin = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).json({ error: 'Không có quyền' });
  next();
};

// ==================== AUTH ====================

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
  if (password.length < 6) return res.json({ success: false, message: 'Mật khẩu phải ít nhất 6 ký tự' });
  const existing = db.get('users').find({ email }).value();
  if (existing) return res.json({ success: false, message: 'Email đã được sử dụng' });
  const hash = bcrypt.hashSync(password, 10);
  const user = { id: nextId('users'), name, email, password: hash, role: 'user', created_at: new Date().toISOString() };
  db.get('users').push(user).write();
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ success: true, user: req.session.user });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.get('users').find({ email }).value();
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ success: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// ==================== PRODUCTS ====================

app.get('/api/products', (req, res) => {
  const { search, category, sort, page = 1, limit = 12 } = req.query;
  const cats = db.get('categories').value();

  let products = db.get('products').value().map(p => {
    const cat = cats.find(c => c.id === p.category_id);
    return { ...p, category_name: cat ? cat.name : '' };
  });

  if (search) {
    const q = search.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q));
  }
  if (category) {
    const cat = cats.find(c => c.slug === category);
    if (cat) products = products.filter(p => p.category_id === cat.id);
  }

  if (sort === 'price_asc') products.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
  else if (sort === 'price_desc') products.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
  else if (sort === 'newest') products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else products.sort((a, b) => b.id - a.id);

  const total = products.length;
  const lim = parseInt(limit);
  const offset = (parseInt(page) - 1) * lim;
  const paged = products.slice(offset, offset + lim);

  res.json({ products: paged, total, pages: Math.ceil(total / lim), currentPage: parseInt(page) });
});

app.get('/api/products/:id', (req, res) => {
  const p = db.get('products').find({ id: parseInt(req.params.id) }).value();
  if (!p) return res.status(404).json({ error: 'Không tìm thấy' });
  const cat = db.get('categories').find({ id: p.category_id }).value();
  res.json({ ...p, category_name: cat ? cat.name : '' });
});

app.get('/api/categories', (req, res) => {
  res.json(db.get('categories').value());
});

// ==================== CART ====================

app.get('/api/cart', (req, res) => {
  const cart = req.session.cart || [];
  const items = cart.map(item => {
    const product = db.get('products').find({ id: item.productId }).value();
    if (!product) return null;
    return { ...item, product };
  }).filter(Boolean);
  res.json(items);
});

app.post('/api/cart', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!req.session.cart) req.session.cart = [];
  const existing = req.session.cart.find(i => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else req.session.cart.push({ productId, quantity });
  res.json({ success: true, count: req.session.cart.reduce((s, i) => s + i.quantity, 0) });
});

app.put('/api/cart/:productId', (req, res) => {
  const { quantity } = req.body;
  const productId = parseInt(req.params.productId);
  if (!req.session.cart) return res.json({ success: false });
  if (quantity <= 0) req.session.cart = req.session.cart.filter(i => i.productId !== productId);
  else { const item = req.session.cart.find(i => i.productId === productId); if (item) item.quantity = quantity; }
  res.json({ success: true, count: req.session.cart.reduce((s, i) => s + i.quantity, 0) });
});

app.delete('/api/cart/:productId', (req, res) => {
  const productId = parseInt(req.params.productId);
  if (req.session.cart) req.session.cart = req.session.cart.filter(i => i.productId !== productId);
  res.json({ success: true, count: (req.session.cart || []).reduce((s, i) => s + i.quantity, 0) });
});

// ==================== ORDERS ====================

app.post('/api/orders', requireLogin, (req, res) => {
  const { name, phone, address, note } = req.body;
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.json({ success: false, message: 'Giỏ hàng trống' });

  let total = 0;
  const items = cart.map(item => {
    const product = db.get('products').find({ id: item.productId }).value();
    const price = product.sale_price || product.price;
    total += price * item.quantity;
    return { product, quantity: item.quantity, price };
  });

  const orderId = nextId('orders');
  const order = { id: orderId, user_id: req.session.user.id, total, status: 'pending', name, phone, address, note: note || '', created_at: new Date().toISOString() };
  db.get('orders').push(order).write();

  items.forEach(i => {
    db.get('order_items').push({ id: nextId('order_items'), order_id: orderId, product_id: i.product.id, quantity: i.quantity, price: i.price }).write();
  });

  req.session.cart = [];
  res.json({ success: true, orderId });
});

app.get('/api/orders/my', requireLogin, (req, res) => {
  const orders = db.get('orders').filter({ user_id: req.session.user.id }).value().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const result = orders.map(order => {
    const items = db.get('order_items').filter({ order_id: order.id }).value().map(oi => {
      const p = db.get('products').find({ id: oi.product_id }).value();
      return { ...oi, name: p ? p.name : 'N/A', image: p ? p.image : 'default.jpg' };
    });
    return { ...order, items };
  });
  res.json(result);
});

// ==================== ADMIN ====================

app.get('/api/admin/products', requireAdmin, (req, res) => {
  const cats = db.get('categories').value();
  const products = db.get('products').value().map(p => {
    const cat = cats.find(c => c.id === p.category_id);
    return { ...p, category_name: cat ? cat.name : '' };
  }).sort((a, b) => b.id - a.id);
  res.json(products);
});

app.post('/api/admin/products', requireAdmin, upload.single('image'), (req, res) => {
  const { name, description, price, sale_price, stock, category_id, brand } = req.body;
  const image = req.file ? req.file.filename : 'default.jpg';
  const product = {
    id: nextId('products'), name, description: description || '', price: parseFloat(price),
    sale_price: sale_price ? parseFloat(sale_price) : null, stock: parseInt(stock),
    image, category_id: parseInt(category_id), brand: brand || '', created_at: new Date().toISOString()
  };
  db.get('products').push(product).write();
  res.json({ success: true });
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, price, sale_price, stock, category_id, brand } = req.body;
  const product = db.get('products').find({ id }).value();
  if (!product) return res.status(404).json({ error: 'Không tìm thấy' });
  const image = req.file ? req.file.filename : product.image;
  db.get('products').find({ id }).assign({ name, description, price: parseFloat(price), sale_price: sale_price ? parseFloat(sale_price) : null, stock: parseInt(stock), image, category_id: parseInt(category_id), brand }).write();
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.get('products').remove({ id: parseInt(req.params.id) }).write();
  res.json({ success: true });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const users = db.get('users').value();
  const orders = db.get('orders').value().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const result = orders.map(order => {
    const user = users.find(u => u.id === order.user_id);
    const items = db.get('order_items').filter({ order_id: order.id }).value().map(oi => {
      const p = db.get('products').find({ id: oi.product_id }).value();
      return { ...oi, name: p ? p.name : 'N/A' };
    });
    return { ...order, user_name: user ? user.name : 'N/A', email: user ? user.email : '', items };
  });
  res.json(result);
});

app.put('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  db.get('orders').find({ id: parseInt(req.params.id) }).assign({ status }).write();
  res.json({ success: true });
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const totalProducts = db.get('products').size().value();
  const totalOrders = db.get('orders').size().value();
  const totalUsers = db.get('users').filter({ role: 'user' }).size().value();
  const orders = db.get('orders').value();
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const users = db.get('users').value();
  const recentOrders = orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(o => {
    const u = users.find(u => u.id === o.user_id);
    return { ...o, user_name: u ? u.name : 'N/A' };
  });
  res.json({ totalProducts, totalOrders, totalUsers, totalRevenue, recentOrders });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server đang chạy tại http://localhost:${PORT}`);
  console.log(`👤 Admin: admin@gmail.com / admin123\n`);
});
