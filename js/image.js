// 单张图片处理与展示；不上传到服务器。
const IMAGE_MAX_EDGE = 1000;
const IMAGE_MAX_FILE_SIZE = 20 * 1024 * 1024;
const IMAGE_MAX_DATA_LENGTH = 512 * 1024;

function validateImageFile(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('请选择 JPG、PNG 或 WebP 图片');
  }
  if (file.size > IMAGE_MAX_FILE_SIZE) {
    throw new Error('原图片超过 20MB，请选择较小图片');
  }
}

function getCompressedImageSize(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效');
  }
  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function isImageDataUrl(value) {
  return typeof value === 'string'
    && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function compressItemImage(file) {
  validateImageFile(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败，请重新选择有效图片'));
    };
    image.onload = () => {
      try {
        const size = getCompressedImageSize(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('当前浏览器无法处理图片，请重新选择或不上传图片');
        // PNG/WebP 透明区域使用白底，统一输出 JPEG 以减少存储占用。
        context.fillStyle = '#fff';
        context.fillRect(0, 0, size.width, size.height);
        context.drawImage(image, 0, 0, size.width, size.height);
        let result;
        for (const quality of [0.78, 0.60, 0.45]) {
          result = canvas.toDataURL('image/jpeg', quality);
          if (result.length <= IMAGE_MAX_DATA_LENGTH) break;
        }
        if (!isImageDataUrl(result)) throw new Error('图片压缩失败，请重新选择图片');
        if (result.length > IMAGE_MAX_DATA_LENGTH) {
          throw new Error('压缩后图片仍过大，请选择较小图片');
        }
        resolve(result);
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    image.src = url;
  });
}

function renderItemImage(image, icon) {
  if (!isImageDataUrl(image)) return icon;
  // Data URL 已限定格式，不把任意地址或用户文本拼入 HTML 属性。
  return `<img class="item-photo" src="${image}" alt="物品图片"><span hidden>${icon}</span>`;
}

function bindItemImageFallbacks(container) {
  container.querySelectorAll('.item-photo').forEach(image => {
    const fallback = () => {
      image.hidden = true;
      image.nextElementSibling.hidden = false;
    };
    image.addEventListener('error', fallback, { once: true });
    if (image.complete && image.naturalWidth === 0) fallback();
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateImageFile, getCompressedImageSize, isImageDataUrl, renderItemImage, bindItemImageFallbacks };
}
