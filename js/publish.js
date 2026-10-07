// js/publish.js - 发布页逻辑

let currentType = 'lost';
let selectedImage = '';
let imageProcessing = false;
let imageRequest = 0;

// 页面加载时，给日期默认值设为今天
document.addEventListener('DOMContentLoaded', function () {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date').value = today;
  document.getElementById('image-file').addEventListener('change', selectImage);
  document.getElementById('remove-image').addEventListener('click', removeImage);
});

function renderImageSelection() {
  const preview = document.getElementById('image-preview');
  preview.hidden = !selectedImage;
  if (selectedImage) preview.src = selectedImage;
  else preview.removeAttribute('src');
  document.getElementById('remove-image').hidden = !selectedImage && !imageProcessing;
  document.getElementById('image-choice-label').innerHTML = selectedImage
    ? '重新选择图片' : '<span class="plus">+</span>上传物品图片（可选）';
  document.getElementById('image-status').textContent = imageProcessing
    ? '图片处理中，请稍候…' : selectedImage ? '已选择 1 张图片，可重新选择或删除' : '最多 1 张 JPG / PNG / WebP 图片，可不上传';
  document.getElementById('submit-post').disabled = imageProcessing;
}

async function selectImage(event) {
  const files = event.target.files;
  if (!files || !files.length) return; // 取消选择保留已有图片。
  const file = files[0];
  const count = files.length;
  event.target.value = ''; // 允许失败后重选同一个文件。
  const request = ++imageRequest;
  selectedImage = '';
  imageProcessing = true;
  renderImageSelection();
  try {
    if (count !== 1) throw new Error('每条信息最多选择 1 张图片');
    const image = await compressItemImage(file);
    if (request === imageRequest) selectedImage = image;
  } catch (e) {
    if (request === imageRequest) showToast(e.message || '图片处理失败，请重新选择');
  } finally {
    // 删除或重新选择后，过期处理结果不得覆盖当前选择。
    if (request === imageRequest) {
      imageProcessing = false;
      renderImageSelection();
    }
  }
}

function removeImage() {
  imageRequest++;
  selectedImage = '';
  imageProcessing = false;
  document.getElementById('image-file').value = '';
  renderImageSelection();
}

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
  if (imageProcessing) {
    showToast('图片处理中，请稍候再发布');
    return;
  }
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
      contact: contact,
      image: selectedImage
    });

    // 跳转到发布成功页，带上 id
    window.location.href = 'publish-success.html?id=' + newItem.id;
  } catch (e) {
    showToast(e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ? '发布失败，图片可能过大或本地存储空间不足，请删除图片或清理空间后重试'
      : e.message);
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
