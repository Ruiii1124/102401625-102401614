const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createPage(updateStatus) {
  const toast = { textContent: '', classList: { add() {}, remove() {} } };
  const context = vm.createContext({
    updateStatus,
    setTimeout() {},
    window: { location: { href: 'my-posts.html' } },
    document: { addEventListener() {}, getElementById: () => toast }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/my-posts.js'), 'utf8'), context);
  return { context, toast };
}

describe('我的发布状态更新反馈', function () {
  it('保存异常或归属拒绝时提示失败并留在当前页', function () {
    for (const message of ['QuotaExceededError', '只能修改本人发布的信息']) {
      const page = createPage(() => { throw new Error(message); });
      page.context.markResolved('item-a');
      expect(page.context.window.location.href).to.equal('my-posts.html');
      expect(page.toast.textContent).to.equal('状态更新失败，请重试');
    }
  });

  it('更新成功才跳转状态成功页', function () {
    const page = createPage((id, status) => id === 'item-a' && status === 'resolved');
    page.context.markResolved('item-a');
    expect(page.context.window.location.href).to.equal('status-updated.html?id=item-a');
    expect(page.toast.textContent).to.equal('');
  });

  it('不存在的记录保持原有提示且不跳转', function () {
    const page = createPage(() => false);
    page.context.markResolved('missing');
    expect(page.context.window.location.href).to.equal('my-posts.html');
    expect(page.toast.textContent).to.equal('操作失败，未找到该信息');
  });
});
