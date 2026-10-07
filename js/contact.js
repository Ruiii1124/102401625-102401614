// js/contact.js - 联系发布者页

let currentItem = null;

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

  renderContact();
});

function renderContact() {
  const contact = currentItem.contact;

  document.getElementById('contact-content').innerHTML = `
    <div class="phone-icon">📞</div>
    <h2>联系发布者</h2>
    <div class="contact-value" id="contact-value">${escapeHtml(contact)}</div>
    <p class="tip">
      请先核对物品特征，不要公开完整学号等隐私信息。<br>
      点击下方按钮可一键复制联系方式。
    </p>
    <button class="btn-primary" id="copy-contact" style="margin-bottom:12px;">复制联系方式</button>
    <button class="btn-secondary" onclick="goBack()">返回详情</button>
  `;
  document.getElementById('copy-contact').addEventListener('click', () => copyContact(contact));
}

// 一键复制
async function copyContact(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      showToast('已复制：' + text);
      return;
    } catch (e) {
      // Clipboard API 被拒绝时尝试已有兼容路径。
    }
  }
  fallbackCopy(text);
}

// 兼容旧浏览器的复制方式
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }

  document.body.removeChild(textarea);
  showToast(ok ? '已复制：' + text : '复制失败，请手动复制');
}

function renderNotFound() {
  document.getElementById('contact-content').innerHTML = `
    <div class="empty">
      <span class="icon">📭</span>
      没有找到这条信息
      <div style="margin-top:20px;">
        <button class="btn-primary" onclick="goHome()">返回首页</button>
      </div>
    </div>
  `;
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function goBack() {
  if (history.length > 1) history.back();
  else window.location.href = 'index.html';
}

function goHome() {
  window.location.href = 'index.html';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
