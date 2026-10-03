// tests/data.test.js
// 校园失物招领 - 数据层单元测试
// 运行方式：在项目根目录执行 npm test

const { expect } = require('chai');

// 模拟浏览器 localStorage，供 Node.js 环境使用
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock();

// 引入数据层
const data = require('../js/data.js');

describe('校园失物招领 - 数据层测试', function () {

  beforeEach(function () {
    localStorage.clear();
  });

  it('1. 空存储时 getAllItems 返回空数组', function () {
    const items = data.getAllItems();
    expect(items).to.be.an('array');
    expect(items).to.have.lengthOf(0);
  });

  it('2. addItem 正常添加一条信息，getAllItems 长度变为 1', function () {
    const item = data.addItem({
      type: 'lost',
      name: '校园卡',
      category: '校园卡',
      location: '三区教学楼',
      date: '2026-10-05',
      description: '蓝色卡套',
      contact: '2766912385'
    });

    expect(item).to.have.property('id');
    expect(item.status).to.equal('active');
    expect(data.getAllItems()).to.have.lengthOf(1);
  });

  it('3. addItem 缺少必填字段 name 时抛出错误', function () {
    expect(function () {
      data.addItem({
        type: 'lost',
        name: '',
        location: '三区教学楼',
        date: '2026-10-05',
        contact: '2766912385'
      });
    }).to.throw('缺少必填字段：name');
  });

  it('4. addItem 传入非法 type 时抛出错误', function () {
    expect(function () {
      data.addItem({
        type: 'unknown',
        name: '钥匙',
        location: '食堂',
        date: '2026-10-05',
        contact: '2766912385'
      });
    }).to.throw('type 必须是 lost 或 found');
  });

  it('5. searchItems 关键词"校园卡"能匹配到名称包含它的记录', function () {
    data.addItem({
      type: 'lost', name: '校园卡', location: '教学楼',
      date: '2026-10-05', contact: '123'
    });
    data.addItem({
      type: 'found', name: '钥匙', location: '食堂',
      date: '2026-10-05', contact: '456'
    });

    const result = data.searchItems('校园卡');
    expect(result).to.have.lengthOf(1);
    expect(result[0].name).to.equal('校园卡');
  });

  it('6. searchItems 关键词能匹配到描述中的内容', function () {
    data.addItem({
      type: 'lost', name: '雨伞', location: '图书馆',
      date: '2026-10-05', description: '深蓝色折叠伞', contact: '123'
    });

    const result = data.searchItems('深蓝色');
    expect(result).to.have.lengthOf(1);
  });

  it('7. searchItems 关键词不匹配时返回空数组', function () {
    data.addItem({
      type: 'lost', name: '校园卡', location: '教学楼',
      date: '2026-10-05', contact: '123'
    });

    const result = data.searchItems('不存在的物品xyz');
    expect(result).to.be.an('array');
    expect(result).to.have.lengthOf(0);
  });

  it('8. searchItems 搜索不区分大小写', function () {
    data.addItem({
      type: 'found', name: 'AirPods', location: '运动场',
      date: '2026-10-05', contact: '123'
    });

    const result = data.searchItems('airpods');
    expect(result).to.have.lengthOf(1);
  });

  it('9. filterByType 能正确筛选寻物和招领', function () {
    data.addItem({ type: 'lost', name: '校园卡', location: 'A', date: '2026-10-05', contact: '1' });
    data.addItem({ type: 'found', name: '钥匙', location: 'B', date: '2026-10-05', contact: '2' });
    data.addItem({ type: 'lost', name: '雨伞', location: 'C', date: '2026-10-05', contact: '3' });

    expect(data.filterByType('lost')).to.have.lengthOf(2);
    expect(data.filterByType('found')).to.have.lengthOf(1);
    expect(data.filterByType('all')).to.have.lengthOf(3);
  });

  it('10. updateStatus 能把 active 改为 resolved', function () {
    const item = data.addItem({
      type: 'lost', name: '校园卡', location: 'A',
      date: '2026-10-05', contact: '1'
    });

    const ok = data.updateStatus(item.id, 'resolved');
    expect(ok).to.equal(true);

    const updated = data.getItemById(item.id);
    expect(updated.status).to.equal('resolved');
    expect(data.getStatusText(updated.type, updated.status)).to.equal('已找到');
    expect(updated).to.deep.equal({ ...item, status: 'resolved' });
  });

  it('11. updateStatus 传入不存在的 id 返回 false', function () {
    data.addItem({
      type: 'lost', name: '校园卡', location: 'A',
      date: '2026-10-05', contact: '1'
    });
    const before = data.getAllItems();
    const ok = data.updateStatus('not-exist-id', 'resolved');
    expect(ok).to.equal(false);
    expect(data.getAllItems()).to.deep.equal(before);
  });

  it('12. deleteItem 删除后 getAllItems 长度减 1', function () {
    const item = data.addItem({
      type: 'lost', name: '校园卡', location: 'A',
      date: '2026-10-05', contact: '1'
    });

    expect(data.getAllItems()).to.have.lengthOf(1);
    const ok = data.deleteItem(item.id);
    expect(ok).to.equal(true);
    expect(data.getAllItems()).to.have.lengthOf(0);
  });

  [
    ['lost', 'active', '寻找中'],
    ['lost', 'resolved', '已找到'],
    ['found', 'active', '待认领'],
    ['found', 'resolved', '已归还']
  ].forEach(([type, status, expected], index) => {
    it(`${13 + index}. ${type} + ${status} 显示“${expected}”`, function () {
      expect(data.getStatusText(type, status)).to.equal(expected);
    });
  });

  it('17. 招领 active 更新为 resolved 后显示已归还', function () {
    const item = data.addItem({
      type: 'found', name: '钥匙', location: '食堂',
      date: '2026-10-05', contact: '123'
    });
    expect(item.status).to.equal('active');
    expect(data.getStatusText(item.type, item.status)).to.equal('待认领');

    expect(data.updateStatus(item.id, 'resolved')).to.equal(true);
    const updated = data.getItemById(item.id);
    expect(data.getStatusText(updated.type, updated.status)).to.equal('已归还');
    expect(updated).to.deep.equal({ ...item, status: 'resolved' });
  });

  it('18. 非法 status 被拒绝且不改变已保存的信息', function () {
    const item = data.addItem({
      type: 'lost', name: '校园卡', location: '教学楼',
      date: '2026-10-05', contact: '123'
    });
    const before = data.getAllItems();

    ['done', '已找到', '已归还', '', null, undefined].forEach(status => {
      expect(() => data.updateStatus(item.id, status))
        .to.throw('status 必须是 active 或 resolved');
      expect(data.getAllItems()).to.deep.equal(before);
    });
  });

  it('19. 未知信息类型不误显示正常业务状态', function () {
    expect(data.getStatusText('unknown', 'resolved')).to.equal('状态未知');
  });

  it('20. 未知存储状态不误显示已完成', function () {
    expect(data.getStatusText('lost', 'done')).to.equal('状态未知');
  });

  it('ownerId 首次生成并在后续访问中保持一致，发布时记录归属', function () {
    const ownerId = data.getOwnerId();
    expect(ownerId).to.be.a('string').and.not.equal('');
    expect(data.getOwnerId()).to.equal(ownerId);
    const item = data.addItem({ type: 'lost', name: '卡', location: 'A', date: '2026-10-03', contact: '123' });
    expect(item.ownerId).to.equal(ownerId);
    expect(data.getItemById(item.id).ownerId).to.equal(ownerId);
  });

  it('filterByOwner 只返回对应发布者的记录', function () {
    localStorage.setItem(data.OWNER_KEY, 'owner-a');
    const first = data.addItem({ type: 'lost', name: '卡', location: 'A', date: '2026-10-03', contact: '123' });
    localStorage.setItem(data.OWNER_KEY, 'owner-b');
    const second = data.addItem({ type: 'found', name: '钥匙', location: 'B', date: '2026-10-03', contact: '456' });
    expect(data.filterByOwner('owner-a')).to.deep.equal([first]);
    expect(data.filterByOwner('owner-b')).to.deep.equal([second]);
  });

  it('非本人不能修改状态，持久化数据保持原样', function () {
    localStorage.setItem(data.OWNER_KEY, 'owner-a');
    const item = data.addItem({ type: 'lost', name: '卡', location: 'A', date: '2026-10-03', contact: '123' });
    const before = localStorage.getItem(data.STORAGE_KEY);
    localStorage.setItem(data.OWNER_KEY, 'owner-b');
    expect(() => data.updateStatus(item.id, 'resolved')).to.throw('只能修改本人发布的信息');
    expect(localStorage.getItem(data.STORAGE_KEY)).to.equal(before);
  });

  it('缺少 ownerId 的旧记录仍可浏览，但不能被自动认领或修改', function () {
    const legacy = { id: 'legacy', type: 'lost', name: '旧卡', status: 'active' };
    data.saveAllItems([legacy]);
    expect(data.getItemById('legacy')).to.deep.equal(legacy);
    expect(data.searchItems('旧卡')).to.deep.equal([legacy]);
    expect(() => data.updateStatus('legacy', 'resolved')).to.throw('只能修改本人发布的信息');
    expect(data.getItemById('legacy')).to.deep.equal(legacy);
  });

  it('状态保存失败抛出异常，已存储状态不变，恢复存储后可重试', function () {
    const item = data.addItem({ type: 'found', name: '卡', location: 'A', date: '2026-10-03', contact: '123' });
    const before = localStorage.getItem(data.STORAGE_KEY);
    const original = localStorage.setItem;
    try {
      localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
      expect(() => data.updateStatus(item.id, 'resolved')).to.throw('QuotaExceededError');
      expect(localStorage.getItem(data.STORAGE_KEY)).to.equal(before);
    } finally {
      localStorage.setItem = original;
    }
    expect(data.updateStatus(item.id, 'resolved')).to.equal(true);
    expect(data.getItemById(item.id).status).to.equal('resolved');
  });

});
