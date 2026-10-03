// js/detail.js - 详情页逻辑

let currentItem = null;

// 页面加载
document.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    renderNotFound();
    return;
  }

  currentItem = getItemById(id);

  if (!currentItem) {
    renderNotFound();
    return;
  }

  renderDetail();
});

// 渲染详情
function renderDetail() {
  const item = currentItem;
  const icon = getCategoryIcon(item.category);
  const typeText = item.type === 'lost' ? '寻物启事' : '招领信息';
  const typeClass = item.type === 'lost' ? 'lost' : 'found';

  const statusText = getStatusText(item.type, item.status);
  const statusClass = item.status === 'resolved' ? 'resolved' : typeClass;
  const statusTag = `<span class="tag ${statusClass}">${statusText}</span>`;

  const html = `
    <div class="detail-image">${icon}</div>

    <div class="detail-title">
      <h2>${escapeHtml(item.name)}</h2>
      <span class="tag ${typeClass}">${typeText}</span>
    </div>

    <div style="margin-bottom:12px;">${statusTag}</div>

    <div class="detail-row">
      <span class="label">📍 地点</span>
      <span>${escapeHtml(item.location)}</span>
    </div>

    <div class="detail-row">
      <span class="label">🕐 时间</span>
      <span>${escapeHtml(item.date)}</span>
    </div>

    <div class="detail-row">
      <span class="label">📂 分类</span>
      <span>${escapeHtml(item.category)}</span>
    </div>

    <div class="detail-desc">
      <strong>物品描述</strong><br>
      ${escapeHtml(item.description) || '发布者未填写详细描述。'}
    </div>

    <div class="publisher-card">
      <div class="avatar">👤</div>
      <div>
        <div class="name">校园热心同学</div>
        <div class="time">发布于 ${formatTime(item.createdAt)}</div>
      </div>
    </div>

    ${item.status === 'resolved'
      ? `<button class="btn-secondary" disabled style="opacity:0.5;">该信息${statusText}</button>`
      : '<button class="btn-primary" onclick="goContact()">联系发布者</button>'
    }
  `;

  document.getElementById('detail-content').innerHTML = html;
}

// 找不到信息
function renderNotFound() {
  document.getElementById('detail-content').innerHTML = `
    <div class="empty">
      <span class="icon">📭</span>
      没有找到这条信息，可能已被删除
      <div style="margin-top:20px;">
        <button class="btn-primary" onclick="goHome()">返回首页</button>
      </div>
    </div>
  `;
}

// 进入联系页
function goContact() {
  if (!currentItem) return;
  window.location.href = 'contact.html?id=' + currentItem.id;
}

// 分类图标
function getCategoryIcon(category) {
  const map = {
    '校园卡': '💳', '钥匙': '🔑', '雨伞': '☂️',
    '电子产品': '🎧', '书籍': '📚', '其他': '📦'
  };
  return map[category] || '📦';
}

// 时间格式化
function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now - d;

  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / 3600000) + '小时前';

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}月${day}日`;
}

// 返回
function goBack() {
  if (history.length > 1) history.back();
  else window.location.href = 'index.html';
}

function goHome() {
  window.location.href = 'index.html';
}

// 转义
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
