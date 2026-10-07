const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 加载实际页面脚本，用最小 DOM 和剪贴板替身验证事件及失败分支。
function createContactPage(clipboard, execCommand = () => false) {
  const fields = {
    'contact-content': { innerHTML: '' },
    'copy-contact': { addEventListener(event, handler) { this.click = handler; } },
    toast: { textContent: '', classList: { add() {}, remove() {} } }
  };
  const children = [];
  const context = vm.createContext({
    navigator: { clipboard },
    setTimeout() {},
    document: {
      addEventListener() {},
      getElementById: id => fields[id],
      createElement: () => ({ style: {}, select() {} }),
      body: {
        appendChild: child => children.push(child),
        removeChild: child => children.splice(children.indexOf(child), 1)
      },
      execCommand
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/contact.js'), 'utf8'), context);
  return { context, fields, children };
}

describe('联系方式复制', function () {
  it('特殊字符通过事件绑定原样复制，不进入内联 JavaScript', async function () {
    const copied = [];
    const page = createContactPage({ writeText: async text => copied.push(text) });
    for (const text of ["O'Reilly", 'Tom & Jerry', '<test>', '".*', 'QQ：2766912385']) {
      page.context.testContact = text;
      vm.runInContext('currentItem = { contact: testContact }; renderContact();', page.context);
      expect(page.fields['contact-content'].innerHTML).not.to.include('onclick="copyContact');
      await page.fields['copy-contact'].click();
      expect(copied[copied.length - 1]).to.equal(text);
      expect(page.fields.toast.textContent).to.equal('已复制：' + text);
    }
  });

  it('Clipboard API 被拒绝后兼容复制成功才提示成功', async function () {
    const page = createContactPage({ writeText: async () => { throw new Error('denied'); } }, () => true);
    await page.context.copyContact('123');
    expect(page.fields.toast.textContent).to.equal('已复制：123');
    expect(page.children).to.have.lengthOf(0);
  });

  it('两条复制路径均失败时提示手动复制', async function () {
    const page = createContactPage({ writeText: async () => { throw new Error('denied'); } });
    await page.context.copyContact('123');
    expect(page.fields.toast.textContent).to.equal('复制失败，请手动复制');
    expect(page.children).to.have.lengthOf(0);
  });

  it('Clipboard API 同步抛错时也走兼容路径', async function () {
    const page = createContactPage({ writeText: () => { throw new Error('denied'); } });
    await page.context.copyContact('123');
    expect(page.fields.toast.textContent).to.equal('复制失败，请手动复制');
  });

  it('没有 Clipboard API 且兼容接口抛错时不误报成功', async function () {
    const page = createContactPage(undefined, () => { throw new Error('unsupported'); });
    await page.context.copyContact('123');
    expect(page.fields.toast.textContent).to.equal('复制失败，请手动复制');
    expect(page.children).to.have.lengthOf(0);
  });
});
