// js/search.js - 搜索页逻辑

const HISTORY_KEY = 'campus_lost_found_search_history';

let currentType = 'all';
let currentCat = 'all';
let currentStatus = 'all';

// 页面加载
document.addEventListener('DOMContentLoaded', function () {
  // 如果 URL 带了 keyword（从首页分类入口跳转过来），自动填入
  const params = new URLSearchParams(window.location.search);
  const kw = params.get('keyword');
  if (kw) {
    document.getElementById('keyword').value = kw;
  }
  document.getElementById('location').value = params.get('location') || '';

  renderHistory();
});

// 切换信息类型
function switchType(btn, type) {
  currentType = type;
  document.querySelectorAll('#type-tabs button').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');
}

// 切换物品分类
function switchCat(btn, cat) {
  currentCat = cat;
  document.querySelectorAll('#cat-tabs button').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');
}

// 切换信息状态
function switchStatus(btn, status) {
  currentStatus = status;
  document.querySelectorAll('#status-tabs button').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');
}

// 渲染搜索历史
function renderHistory() {
  const listEl = document.getElementById('history-list');
  const history = getHistory();

  if (history.length === 0) {
    listEl.innerHTML = '<div style="color:#9ca3af;font-size:13px;padding:8px 0;">暂无搜索历史</div>';
    return;
  }

  listEl.innerHTML = history.map((kw, index) => `
    <div class="history-item" data-index="${index}">
      <span class="icon">🕐</span>
      ${escapeHtml(kw)}
    </div>
  `).join('');

  // 用事件委托绑定点击，避免关键词里的特殊字符破坏 HTML
  listEl.querySelectorAll('.history-item').forEach(el => {
    el.addEventListener('click', function () {
      const idx = parseInt(this.getAttribute('data-index'), 10);
      const list = getHistory();
      if (list[idx]) {
        useHistory(list[idx]);
      }
    });
  });
}

// 读取搜索历史
function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// 保存一条搜索历史
function addHistory(keyword) {
  if (!keyword || keyword.trim() === '') return;
  let history = getHistory();
  history = history.filter(k => k !== keyword);
  history.unshift(keyword);
  history = history.slice(0, 5); // 最多保留 5 条
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// 点击历史记录，填入搜索框并搜索
function useHistory(keyword) {
  document.getElementById('keyword').value = keyword;
  doSearch();
}

// 执行搜索：跳转到结果页，把条件带过去
function doSearch() {
  const keyword = document.getElementById('keyword').value.trim();
  const location = document.getElementById('location').value.trim();

  if (keyword) {
    addHistory(keyword);
  }

  const params = new URLSearchParams();
  if (keyword) params.set('keyword', keyword);
  if (currentType !== 'all') params.set('type', currentType);
  if (currentCat !== 'all') params.set('category', currentCat);
  if (currentStatus !== 'all') params.set('status', currentStatus);
  if (location) params.set('location', location);

  window.location.href = 'search-result.html?' + params.toString();
}

// 返回上一页
function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    window.location.href = 'index.html';
  }
}

// 转义 HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
