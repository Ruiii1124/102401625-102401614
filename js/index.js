// js/index.js - 首页逻辑

let currentFilter = 'all';

// 页面加载时渲染列表
document.addEventListener('DOMContentLoaded', function () {
  renderList();
});

// 切换筛选标签
function switchFilter(btn, type) {
  currentFilter = type;

  // 更新按钮高亮
  document.querySelectorAll('.filter-tabs button').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');

  renderList();
}

// 渲染信息卡片列表
function renderList() {
  const listEl = document.getElementById('card-list');
  let items = filterByType(currentFilter);

  // 首页只展示前 5 条
  items = items.slice(0, 5);

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="empty">
        <span class="icon">📭</span>
        还没有相关信息，快去发布一条吧
      </div>
    `;
    return;
  }

  listEl.innerHTML = items.map(item => {
    const icon = getCategoryIcon(item.category);
    const typeText = item.type === 'lost' ? '寻物' : '招领';
    const typeClass = item.type === 'lost' ? 'lost' : 'found';
    const timeText = formatTime(item.createdAt);

    // 已解决状态标签
    const statusTag = item.status === 'resolved'
      ? '<span class="tag resolved">已解决</span>'
      : '';

    return `
      <div class="card" onclick="goDetail('${item.id}')">
        <div class="thumb">${icon}</div>
        <div class="info">
          <span class="tag ${typeClass}">${typeText}</span>
          ${statusTag}
          <div class="name">${escapeHtml(item.name)}</div>
          <div class="meta">📍 ${escapeHtml(item.location)}</div>
          <div class="time">${timeText}</div>
        </div>
      </div>
    `;
  }).join('');
}

// 根据分类返回图标
function getCategoryIcon(category) {
  const map = {
    '校园卡': '💳',
    '钥匙': '🔑',
    '雨伞': '☂️',
    '电子产品': '🎧',
    '书籍': '📚',
    '其他': '📦'
  };
  return map[category] || '📦';
}

// 格式化时间
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

// 防止 XSS，转义 HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 跳转搜索页
function goSearch() {
  window.location.href = 'search.html';
}

// 带关键词跳转搜索页
function goSearchWith(keyword) {
  window.location.href = 'search.html?keyword=' + encodeURIComponent(keyword);
}

// 跳转详情页
function goDetail(id) {
  window.location.href = 'detail.html?id=' + id;
}