const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt = require('bcryptjs');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Khởi tạo cấu trúc DB
db.defaults({
  users: [],
  categories: [],
  products: [],
  orders: [],
  order_items: [],
  _seq: { users: 1, categories: 1, products: 1, orders: 1, order_items: 1 }
}).write();

// Helper: auto increment id
function nextId(table) {
  const id = db.get(`_seq.${table}`).value();
  db.set(`_seq.${table}`, id + 1).write();
  return id;
}

// Seed dữ liệu nếu chưa có
if (db.get('categories').size().value() === 0) {
  const cats = [
    { id: 1, name: 'Chăm sóc da', slug: 'cham-soc-da' },
    { id: 2, name: 'Trang điểm', slug: 'trang-diem' },
    { id: 3, name: 'Chăm sóc tóc', slug: 'cham-soc-toc' },
    { id: 4, name: 'Nước hoa', slug: 'nuoc-hoa' },
    { id: 5, name: 'Chăm sóc cơ thể', slug: 'cham-soc-co-the' }
  ];
  db.set('categories', cats).write();
  db.set('_seq.categories', 6).write();

  const now = new Date().toISOString();
  const products = [
    { id: 1, name: 'Kem dưỡng ẩm Neutrogena', description: 'Kem dưỡng ẩm sâu, phù hợp mọi loại da, giúp da mềm mịn suốt 24 giờ.', price: 285000, sale_price: 240000, stock: 50, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80', category_id: 1, brand: 'Neutrogena', created_at: now },
    { id: 2, name: 'Serum Vitamin C Klairs', description: 'Serum làm sáng da, mờ thâm nám, chứa 5% Vitamin C thuần.', price: 520000, sale_price: 450000, stock: 30, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80', category_id: 1, brand: 'Klairs', created_at: now },
    { id: 3, name: 'Kem chống nắng Anessa', description: 'SPF 50+ PA++++, chống nắng vật lý và hóa học, không nhờn rít.', price: 380000, sale_price: null, stock: 45, image: 'https://images.unsplash.com/photo-1526758097130-bab247274f58?w=400&q=80', category_id: 1, brand: 'Anessa', created_at: now },
    { id: 4, name: 'Son môi MAC Ruby Woo', description: 'Son lì màu đỏ cổ điển, lâu trôi, không khô môi.', price: 650000, sale_price: 580000, stock: 25, image: 'https://images.unsplash.com/photo-1586495777744-4e6232bf2263?w=400&q=80', category_id: 2, brand: 'MAC', created_at: now },
    { id: 5, name: 'Phấn nền Maybelline Fit Me', description: 'Phấn nền che phủ tốt, kiểm soát dầu, 40 tông màu.', price: 195000, sale_price: 165000, stock: 60, image: 'https://images.unsplash.com/photo-1631214524020-3c69b3b0e5e8?w=400&q=80', category_id: 2, brand: 'Maybelline', created_at: now },
    { id: 6, name: "Mascara Benefit They're Real", description: 'Mascara làm dài và cong mi, không lem, bền màu cả ngày.', price: 720000, sale_price: null, stock: 20, image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&q=80', category_id: 2, brand: 'Benefit', created_at: now },
    { id: 7, name: 'Dầu gội Pantene Pro-V', description: 'Dầu gội phục hồi tóc hư tổn, giúp tóc chắc khỏe và bóng mượt.', price: 125000, sale_price: 99000, stock: 80, image: 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400&q=80', category_id: 3, brand: 'Pantene', created_at: now },
    { id: 8, name: 'Dầu xả TRESemmé Keratin', description: 'Dầu xả keratin phục hồi tóc, giảm xơ rối, dưỡng ẩm sâu.', price: 145000, sale_price: null, stock: 70, image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80', category_id: 3, brand: 'TRESemmé', created_at: now },
    { id: 9, name: 'Nước hoa Chanel No.5', description: 'Hương thơm hoa cỏ cổ điển, sang trọng và quyến rũ.', price: 2800000, sale_price: 2500000, stock: 10, image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&q=80', category_id: 4, brand: 'Chanel', created_at: now },
    { id: 10, name: 'Nước hoa Dior Miss Dior', description: 'Hương thơm tươi mát, nữ tính, phù hợp dùng hàng ngày.', price: 2200000, sale_price: null, stock: 15, image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&q=80', category_id: 4, brand: 'Dior', created_at: now },
    { id: 11, name: 'Sữa tắm Dove Dưỡng Ẩm', description: 'Sữa tắm dưỡng ẩm chuyên sâu, hương thơm nhẹ nhàng, da mềm mịn.', price: 89000, sale_price: 75000, stock: 100, image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80', category_id: 5, brand: 'Dove', created_at: now },
    { id: 12, name: 'Kem dưỡng thể Vaseline', description: 'Kem dưỡng thể làm sáng da, dưỡng ẩm 10 ngày liên tục.', price: 115000, sale_price: null, stock: 90, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&q=80', category_id: 5, brand: 'Vaseline', created_at: now }
  ];
  db.set('products', products).write();
  db.set('_seq.products', 13).write();

  // Admin account
  const hash = bcrypt.hashSync('admin123', 10);
  db.get('users').push({ id: 1, name: 'Admin', email: 'admin@gmail.com', password: hash, role: 'admin', created_at: now }).write();
  db.set('_seq.users', 2).write();
}

module.exports = { db, nextId };
