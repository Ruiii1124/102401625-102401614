// js/publish.js - 发布页逻辑

let currentType = 'lost';

// 页面加载时，给日期默认值设为今天
document.addEventListener('DOMContentLoaded', function () {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
});

// 切换寻物 / 招领
function switchType(btn, type) {
  currentType = type;
  document.querySelectorAll('.type-switch button').forEach(b => {
    b.classList.remove('active');
  });
  btn.classList.add('active');
}

// 返回上一页
function goBack() {
  if (history.length > 1) {
    history.back();
  } else {
    window.location.href = 'index.html';
  }
}

// 提交表单
function submitForm() {
  const name = document.getElementById('name').value.trim();
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const location = document.getElementById('location').value.trim();
  const description = document.getElementById('description').value.trim();
  const contact = document.getElementById('contact').value.trim();

  // 必填校验
  if (!name) {
    showToast('请填写物品名称');
    return;
  }
  if (!date) {
    showToast('请选择时间');
    return;
  }
  if (!location) {
    showToast('请填写地点');
    return;
  }
  if (!contact) {
    showToast('请填写联系方式');
    return;
  }

  try {
    const newItem = addItem({
      type: currentType,
      name: name,
      category: category,
      date: date,
      location: location,
      description: description,
      contact: contact
    });

    // 跳转到发布成功页，带上 id
    window.location.href = 'publish-success.html?id=' + newItem.id;
  } catch (e) {
    showToast(e.message);
  }
}

// 显示提示
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 1800);
}