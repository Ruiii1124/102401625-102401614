const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const data = require('../js/data.js');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

function pageContext(url, extras = {}) {
  const fields = {};
  let ready;
  const context = vm.createContext({
    URLSearchParams,
    localStorage: global.localStorage,
    window: { location: { search: url, href: '' } },
    document: {
      addEventListener(event, handler) { ready = handler; },
      getElementById(id) {
        return fields[id] || (fields[id] = {
          value: '', innerHTML: '', textContent: '', querySelectorAll: () => []
        });
      },
      querySelectorAll: () => []
    },
    ...extras
  });
  return { context, fields, ready: () => ready() };
}

describe('分类、地点及组合搜索', function () {
  let target;
  beforeEach(function () {
    global.localStorage.clear();
    const base = { type: 'lost', name: '蓝色教材', category: '书籍', location: '图书馆二楼', date: '2026-10-03', contact: '123' };
    const add = (changes = {}, resolved = true) => {
      const item = data.addItem({ ...base, ...changes });
      if (resolved) data.updateStatus(item.id, 'resolved');
      return item;
    };
    target = add();
    add({ type: 'found' });
    add({ category: '雨伞' });
    add({}, false);
    add({ location: '食堂' });
    add({ name: '词典' });
  });

  it('雨伞分类按 category 精确匹配，不依赖名称', function () {
    const items = data.searchItems('', { category: '雨伞' });
    expect(items).to.have.lengthOf(1);
    expect(items[0].name).to.equal('蓝色教材');
    expect(items[0].category).to.equal('雨伞');
  });

  it('书籍分类排除名称相同的其他分类', function () {
    const items = data.searchItems('', { category: '书籍' });
    expect(items).to.have.lengthOf(5);
    expect(items.every(item => item.category === '书籍')).to.equal(true);
  });

  it('地点关键词支持子串、首尾空格及英文大小写', function () {
    expect(data.searchItems('', { location: ' 图书馆 ' })).to.have.lengthOf(5);
    const item = data.addItem({ type: 'found', name: '卡', location: 'East Campus Library', date: '2026-10-03', contact: '123' });
    expect(data.searchItems('', { location: ' campus ' }).map(it => it.id)).to.deep.equal([item.id]);
  });

  it('空地点不限，其他条件仍有效；缺少地点的旧记录不会抛错', function () {
    const filters = { type: 'lost', category: '书籍', status: 'resolved', location: '   ' };
    expect(data.searchItems('教材', filters)).to.have.lengthOf(2);
    data.saveAllItems([...data.getAllItems(), { id: 'old', name: '旧卡' }]);
    expect(data.searchItems('', { location: '' })).to.have.lengthOf(7);
    expect(data.searchItems('', { location: '图书馆' })).to.have.lengthOf(5);
  });

  it('地点特殊字符按普通文本匹配，不解释为正则表达式', function () {
    const item = data.addItem({ type: 'found', name: '卡', location: 'O\'Reilly <test> ".* & 楼', date: '2026-10-03', contact: '123' });
    for (const location of ["O'Reilly", '<test>', '".*', '&']) {
      expect(data.searchItems('', { location }).map(it => it.id)).to.deep.equal([item.id]);
    }
  });

  it('关键词、类型、分类、状态、地点按 AND 组合，任一条件不符即排除', function () {
    const filters = { type: 'lost', category: '书籍', status: 'resolved', location: '图书馆' };
    expect(data.searchItems('教材', filters).map(it => it.id)).to.deep.equal([target.id]);
  });

  it('空数据及地点无匹配时返回空数组', function () {
    expect(data.searchItems('', { location: '不存在的楼' })).to.deep.equal([]);
    data.clearAllItems();
    expect(data.searchItems('教材', { location: '图书馆', status: 'resolved' })).to.deep.equal([]);
  });

  it('搜索页将所有筛选条件编码到 URL，空地点不写入参数', function () {
    const page = pageContext('');
    vm.runInContext(read('js/search.js'), page.context);
    page.ready();
    page.context.document.getElementById('keyword').value = "O'Reilly";
    page.fields.location.value = ' 图书馆 & 东楼 ';
    vm.runInContext("currentType='lost'; currentCat='书籍'; currentStatus='resolved'; doSearch();", page.context);
    const params = new URLSearchParams(page.context.window.location.href.split('?')[1]);
    expect(Object.fromEntries(params)).to.deep.equal({ keyword: "O'Reilly", type: 'lost', category: '书籍', status: 'resolved', location: '图书馆 & 东楼' });
    page.fields.location.value = ' ';
    page.context.doSearch();
    expect(new URLSearchParams(page.context.window.location.href.split('?')[1]).has('location')).to.equal(false);
  });

  it('结果页实际使用全部条件，重新搜索和排序保留地点筛选', function () {
    const params = new URLSearchParams({ keyword: '教材', type: 'lost', category: '书籍', status: 'resolved', location: '图书馆' });
    const page = pageContext('?' + params, { searchItems: data.searchItems, getStatusText: data.getStatusText });
    const inline = read('search-result.html').match(/<script>([\s\S]*?)<\/script>/)[1];
    vm.runInContext(inline, page.context);
    page.ready();
    expect(page.fields['result-count'].textContent).to.equal('找到 1 条相关信息');
    expect(page.fields['result-list'].innerHTML).to.include(target.id);
    page.context.toggleSort();
    expect(page.fields['result-count'].textContent).to.equal('找到 1 条相关信息');
    page.fields.keyword.value = '词典';
    page.context.redoSearch();
    const next = new URLSearchParams(page.context.window.location.href.split('?')[1]);
    expect(next.get('keyword')).to.equal('词典');
    for (const key of ['type', 'category', 'status', 'location']) {
      expect(next.get(key)).to.equal(params.get(key));
    }
  });

  it('发布、搜索和首页入口使用相同的六种分类', function () {
    const publish = read('publish.html').match(/<select id="category">([\s\S]*?)<\/select>/)[1];
    const values = Array.from(publish.matchAll(/<option value="([^"]+)"/g), match => match[1]);
    const search = Array.from(read('search.html').matchAll(/data-cat="([^"]+)"/g), match => match[1]).filter(value => value !== 'all');
    const home = Array.from(read('index.html').matchAll(/goSearchWith\('([^']+)'\)/g), match => match[1]);
    expect(values).to.deep.equal(['校园卡', '钥匙', '雨伞', '电子产品', '书籍', '其他']);
    expect(search).to.deep.equal(values);
    expect(home).to.deep.equal(values);
  });
});
