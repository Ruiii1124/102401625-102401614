const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const data = require('../js/data.js');
const image = require('../js/image.js');
const DATA_URL = 'data:image/jpeg;base64,/9j/AA==';
const base = { type: 'lost', name: '蓝色雨伞', category: '雨伞', location: '图书馆', date: '2026-10-03', contact: '123' };

function storageMock() {
  const store = new Map();
  return { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key) };
}

function publishPage(compressItemImage, addItem = () => ({ id: 'new-post' })) {
  const fields = {};
  const context = vm.createContext({
    compressItemImage, addItem, setTimeout() {},
    window: { location: { href: 'publish.html' } },
    document: {
      addEventListener() {},
      getElementById(id) {
        return fields[id] || (fields[id] = {
          value: '', hidden: true, disabled: false, textContent: '', innerHTML: '',
          classList: { add() {}, remove() {} }, removeAttribute(name) { delete this[name]; }
        });
      }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/publish.js'), 'utf8'), context);
  for (const [key, value] of Object.entries(base)) {
    if (key !== 'type') context.document.getElementById(key).value = value;
  }
  context.document.getElementById('description').value = '';
  return { context, fields };
}

describe('可选单张物品图片', function () {
  let previousStorage;
  beforeEach(function () {
    previousStorage = global.localStorage;
    global.localStorage = storageMock();
  });
  afterEach(function () { global.localStorage = previousStorage; });

  it('无图片或空图片仍正常发布，不强制增加 image 字段', function () {
    for (const item of [base, { ...base, image: '' }]) {
      const saved = data.addItem(item);
      expect(saved).not.to.have.property('image');
      expect(data.getItemById(saved.id)).to.deep.equal(saved);
    }
  });

  it('寻物和招领图片可保存、读取，搜索和状态更新保留图片', function () {
    for (const type of ['lost', 'found']) {
      const saved = data.addItem({ ...base, type, image: DATA_URL });
      expect(data.getItemById(saved.id).image).to.equal(DATA_URL);
      expect(data.searchItems('雨伞', { type, location: '图书馆' })[0].image).to.equal(DATA_URL);
      data.updateStatus(saved.id, 'resolved');
      expect(data.getItemById(saved.id).image).to.equal(DATA_URL);
    }
  });

  it('无图片旧记录保持原样，与新图片记录共存', function () {
    const legacy = { ...base, id: 'legacy', status: 'active' };
    data.saveAllItems([legacy]);
    data.addItem({ ...base, image: DATA_URL });
    expect(data.getItemById('legacy')).to.deep.equal(legacy);
    expect(data.searchItems('雨伞')).to.have.lengthOf(2);
    expect(image.renderItemImage(legacy.image, '☂️')).to.equal('☂️');
  });

  it('图片发布保存失败时原记录不变，没有半保存的新信息', function () {
    data.addItem(base);
    const before = localStorage.getItem(data.STORAGE_KEY);
    localStorage.setItem = () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); };
    expect(() => data.addItem({ ...base, image: DATA_URL })).to.throw('full');
    expect(localStorage.getItem(data.STORAGE_KEY)).to.equal(before);
    expect(data.getAllItems()).to.have.lengthOf(1);
  });

  it('只接受 JPG、PNG、WebP，拒绝伪装扩展名的非图片和超大文件', function () {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(() => image.validateImageFile({ type, size: 1024 })).not.to.throw();
    }
    for (const type of ['text/plain', 'application/pdf', 'image/svg+xml', '']) {
      expect(() => image.validateImageFile({ name: 'fake.jpg', type, size: 1024 })).to.throw('请选择');
    }
    expect(() => image.validateImageFile({ type: 'image/jpeg', size: 21 * 1024 * 1024 })).to.throw('20MB');
  });

  it('压缩尺寸保留宽高比，限制最长边且不放大小图', function () {
    expect(image.getCompressedImageSize(4000, 3000)).to.deep.equal({ width: 1000, height: 750 });
    expect(image.getCompressedImageSize(600, 1200)).to.deep.equal({ width: 500, height: 1000 });
    expect(image.getCompressedImageSize(320, 200)).to.deep.equal({ width: 320, height: 200 });
    expect(() => image.getCompressedImageSize(0, 200)).to.throw('图片尺寸无效');
  });

  it('合法图片生成展示元素，空值和非法图片地址回退到图标', function () {
    expect(image.renderItemImage(DATA_URL, '☂️')).to.include('class="item-photo"');
    for (const value of [undefined, '', null, 'javascript:alert(1)', 'https://example.com/x.jpg', 'data:image/svg+xml;base64,AA==', 'data:image/png;base64,AA" onclick="x']) {
      expect(image.renderItemImage(value, '☂️')).to.equal('☂️');
    }
  });

  it('图片解码失败隐藏图片并显示原分类图标', function () {
    const photo = { complete: true, naturalWidth: 0, hidden: false, nextElementSibling: { hidden: true }, addEventListener(event, callback) { this.onError = callback; } };
    image.bindItemImageFallbacks({ querySelectorAll: () => [photo] });
    expect(photo.hidden).to.equal(true);
    expect(photo.nextElementSibling.hidden).to.equal(false);
  });

  it('处理失败恢复可发布状态，允许重新选择成功并删除预览', async function () {
    const page = publishPage(async file => {
      if (file.type === 'text/plain') throw new Error('请选择 JPG、PNG 或 WebP 图片');
      return DATA_URL;
    });
    await page.context.selectImage({ target: { files: [{ type: 'text/plain' }], value: 'bad' } });
    expect(page.fields.toast.textContent).to.include('请选择');
    expect(page.fields['image-preview'].hidden).to.equal(true);
    expect(page.fields['submit-post'].disabled).to.equal(false);
    await page.context.selectImage({ target: { files: [{ type: 'image/jpeg' }], value: 'image' } });
    expect(page.fields['image-preview'].src).to.equal(DATA_URL);
    expect(page.fields['image-preview'].hidden).to.equal(false);
    page.context.removeImage();
    expect(page.fields['image-preview'].hidden).to.equal(true);
    expect(page.fields['image-preview']).not.to.have.property('src');
  });

  it('删除或重选后忽略旧任务结果，处理中不允许发布', async function () {
    const pending = [];
    let saves = 0;
    const page = publishPage(() => new Promise(resolve => pending.push(resolve)), () => { saves++; });
    const first = page.context.selectImage({ target: { files: [{}], value: 'a' } });
    page.context.submitForm();
    expect(saves).to.equal(0);
    expect(page.fields.toast.textContent).to.include('图片处理中');
    const second = page.context.selectImage({ target: { files: [{}], value: 'b' } });
    pending[1](DATA_URL);
    await second;
    pending[0]('data:image/png;base64,AA==');
    await first;
    expect(page.fields['image-preview'].src).to.equal(DATA_URL);
    const third = page.context.selectImage({ target: { files: [{}], value: 'c' } });
    page.context.removeImage();
    pending[2](DATA_URL);
    await third;
    expect(page.fields['image-preview'].hidden).to.equal(true);
    expect(page.fields['submit-post'].disabled).to.equal(false);
  });

  it('容量不足时发布页提示原因，保留表单和预览且不跳转', async function () {
    const page = publishPage(async () => DATA_URL, () => { throw Object.assign(new Error('full'), { name: 'QuotaExceededError' }); });
    await page.context.selectImage({ target: { files: [{}], value: 'a' } });
    page.context.submitForm();
    expect(page.context.window.location.href).to.equal('publish.html');
    expect(page.fields.toast.textContent).to.include('图片可能过大或本地存储空间不足');
    expect(page.fields.name.value).to.equal(base.name);
    expect(page.fields['image-preview'].src).to.equal(DATA_URL);
  });
});
