// Utility functions
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

function getImg(image) {
  if (!image) return 'https://placehold.co/300x220/fce4ec/e91e8c?text=My+Pham';
  if (image.startsWith('http')) return image;
  return '/images/products/' + image;
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const id = 'toast_' + Date.now();
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  container.innerHTML += `
    <div id="${id}" class="toast align-items-center text-bg-${type === 'error' ? 'danger' : type === 'info' ? 'info' : 'success'} border-0 show" role="alert">
      <div class="d-flex">
        <div class="toast-body">${icon} ${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="document.getElementById('${id}').remove()"></button>
      </div>
    </div>`;
  setTimeout(() => { const el = document.getElementById(id); if (el) el.remove(); }, 3000);
}

async function updateCartCount() {
  try {
    const res = await fetch('/api/cart');
    const items = await res.json();
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = count;
  } catch {}
}

async function addToCart(productId, qty = 1) {
  const res = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: parseInt(productId), quantity: qty })
  });
  const data = await res.json();
  if (data.success) {
    showToast('Đã thêm vào giỏ hàng');
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = data.count;
  }
}

async function checkAuth() {
  const res = await fetch('/api/me');
  const data = await res.json();
  return data.user;
}

async function updateNavAuth() {
  const user = await checkAuth();
  const navAuth = document.getElementById('navAuth');
  if (!navAuth) return;
  if (user) {
    navAuth.innerHTML = `
      <li class="nav-item dropdown">
        <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
          👤 ${user.name}
        </a>
        <ul class="dropdown-menu dropdown-menu-end">
          ${user.role === 'admin' ? '<li><a class="dropdown-item" href="/admin/index.html">⚙️ Quản trị</a></li><li><hr class="dropdown-divider"></li>' : ''}
          <li><a class="dropdown-item" href="/orders.html">📦 Đơn hàng của tôi</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" onclick="logout()">🚪 Đăng xuất</a></li>
        </ul>
      </li>`;
  } else {
    navAuth.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="/login.html">Đăng nhập</a></li>
      <li class="nav-item"><a class="btn btn-primary ms-2" href="/register.html">Đăng ký</a></li>`;
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

// Init on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  updateNavAuth();
});
