// js/my-posts.js - 我的发布页逻辑

let currentStatus = 'active';

document.addEventListener('DOMContentLoaded', function () {
  renderList();
});

// 切换进行中/已完成
function switchStatus(btn, status) {
  currentStatus = status;
  document.querySelectorAll('.status-tabs button').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');
  renderList();
}

// 渲染我的发布列表
function renderList() {
  const listEl = document.getElementById('my-list');
  const allItems = getAllItems();

  // 只显示当前状态的信息
  const items = allItems.filter(it => it.status === currentStatus);

  if (items.length === 0) {
    const tip = currentStatus === 'active'
      ? '还没有进行中的信息，去发布一条吧'
      : '还没有已完成的信息';
    listEl.innerHTML = `
      <div class="empty">
        <span class="icon">📭</span>
        ${tip}
        ${currentStatus === 'active' ? '<div style="margin-top:20px;"><button class="btn-primary" onclick="goPublish()">去发布</button></div>' : ''}
      </div>
    `;
    return;
  }

  listEl.innerHTML = items.map(item => {
    const icon = getCategoryIcon(item.category);
    const typeText = item.type === 'lost' ? '寻物' : '招领';
    const typeClass = item.type === 'lost' ? 'lost' : 'found';

    // 进行中：显示两个标记按钮
    // 已完成：只显示状态标签
    let actionHtml = '';
    if (currentStatus === 'active') {
      const btnText = item.type === 'lost' ? '标记为已找回' : '标记为已归还';
      actionHtml = `
        <div class="actions">
          <button class="primary" onclick="markResolved('${item.id}', '${item.type}')">${btnText}</button>
          <button onclick="goDetail('${item.id}')">查看详情</button>
        </div>
      `;
    } else {
      actionHtml = `
        <div class="actions">
          <button onclick="goDetail('${item.id}')">查看详情</button>
        </div>
      `;
    }

    return `
      <div class="my-card">
        <div class="top" onclick="goDetail('${item.id}')">
          <div class="thumb">${icon}</div>
          <div class="info" style="flex:1;min-width:0;">
            <span class="tag ${typeClass}">${typeText}</span>
            ${item.status === 'resolved' ? '<span class="tag resolved">已解决</span>' : ''}
            <div class="name">${escapeHtml(item.name)}</div>
            <div class="meta" style="font-size:12px;color:#6b7280;">📍 ${escapeHtml(item.location)}</div>
            <div class="time" style="font-size:11px;color:#9ca3af;">${escapeHtml(item.date)}</div>
          </div>
        </div>
        ${actionHtml}
      </div>
    `;
  }).join('');
}

// 标记为已解决
function markResolved(id, type) {
  const ok = updateStatus(id, 'resolved');
  if (ok) {
    // 跳转到状态更新成功页
    window.location.href = 'status-updated.html?id=' + id + '&type=' + type;
  } else {
    showToast('操作失败，未找到该信息');
  }
}

// 跳转发布页
function goPublish() {
  window.location.href = 'publish.html';
}

// 跳转详情页
function goDetail(id) {
  window.location.href = 'detail.html?id=' + id;
}

// 返回
function goBack() {
  if (history.length > 1) history.back();
  else window.location.href = 'index.html';
}

// 分类图标
function getCategoryIcon(category) {
  const map = {
    '校园卡': '💳', '钥匙': '🔑', '雨伞': '☂️',
    '电子产品': '🎧', '书籍': '📚', '其他': '📦'
  };
  return map[category] || '📦';
}

// 提示
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

// 转义
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}