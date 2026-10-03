// js/data.js
// 校园失物招领 - 数据层
// 所有数据操作都封装在这里，页面只调用这些函数，不直接操作 localStorage

const STORAGE_KEY = 'campus_lost_found_items';
const OWNER_KEY = 'campus_lost_found_owner_id';

/**
 * 将信息类型和存储状态转换为统一的业务文案。
 * @param {string} type - 'lost' | 'found'
 * @param {string} status - 'active' | 'resolved'
 * @returns {string}
 */
function getStatusText(type, status) {
  if (type !== 'lost' && type !== 'found') return '状态未知';
  if (status !== 'active' && status !== 'resolved') return '状态未知';

  const labels = {
    lost: { active: '寻找中', resolved: '已找到' },
    found: { active: '待认领', resolved: '已归还' }
  };
  return labels[type][status];
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 获取当前用户标识（首次访问时生成并存入 localStorage）
 * @returns {string}
 */
function getOwnerId() {
  let id = localStorage.getItem(OWNER_KEY);
  if (!id) {
    id = 'owner_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(OWNER_KEY, id);
  }
  return id;
}

/**
 * 获取所有信息
 * @returns {Array} 信息数组
 */
function getAllItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * 保存所有信息到 localStorage
 * @param {Array} items
 */
function saveAllItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * 添加一条信息
 * @param {Object} item - { type, name, category, location, date, description, contact }
 * @returns {Object} 添加成功的信息（含 id、status、ownerId、createdAt）
 * @throws {Error} 缺少必填字段时抛出错误
 */
function addItem(item) {
  const required = ['type', 'name', 'location', 'date', 'contact'];
  for (const field of required) {
    if (!item[field] || String(item[field]).trim() === '') {
      throw new Error(`缺少必填字段：${field}`);
    }
  }
  if (item.type !== 'lost' && item.type !== 'found') {
    throw new Error('type 必须是 lost 或 found');
  }

  const newItem = {
    id: generateId(),
    type: item.type,
    name: item.name.trim(),
    category: item.category || '其他',
    location: item.location.trim(),
    date: item.date,
    description: (item.description || '').trim(),
    contact: item.contact.trim(),
    status: 'active',
    ownerId: getOwnerId(),
    createdAt: Date.now()
  };

  const items = getAllItems();
  items.unshift(newItem);
  saveAllItems(items);
  return newItem;
}

/**
 * 根据 id 获取一条信息
 * @param {string} id
 * @returns {Object|null}
 */
function getItemById(id) {
  const items = getAllItems();
  return items.find(item => item.id === id) || null;
}

/**
 * 搜索信息
 * @param {string} keyword - 关键词，匹配名称和描述
 * @returns {Array}
 */
function searchItems(keyword) {
  if (!keyword || keyword.trim() === '') return getAllItems();
  const kw = keyword.trim().toLowerCase();
  return getAllItems().filter(item => {
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    return name.includes(kw) || desc.includes(kw);
  });
}

/**
 * 按类型筛选
 * @param {string} type - 'all' | 'lost' | 'found'
 * @returns {Array}
 */
function filterByType(type) {
  const items = getAllItems();
  if (type === 'all') return items;
  return items.filter(item => item.type === type);
}

/**
 * 按发布者筛选
 * @param {string} ownerId
 * @returns {Array}
 */
function filterByOwner(ownerId) {
  return getAllItems().filter(item => item.ownerId === ownerId);
}

/**
 * 更新信息状态
 * @param {string} id
 * @param {string} status - 'active' | 'resolved'
 * @returns {boolean} 是否更新成功
 */
function updateStatus(id, status) {
  if (status !== 'active' && status !== 'resolved') {
    throw new Error('status 必须是 active 或 resolved');
  }
  const items = getAllItems();
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return false;
  items[index].status = status;
  saveAllItems(items);
  return true;
}

/**
 * 删除一条信息
 * @param {string} id
 * @returns {boolean}
 */
function deleteItem(id) {
  const items = getAllItems();
  const newItems = items.filter(item => item.id !== id);
  if (newItems.length === items.length) return false;
  saveAllItems(newItems);
  return true;
}

/**
 * 清空所有数据（测试用）
 */
function clearAllItems() {
  localStorage.removeItem(STORAGE_KEY);
}

// 导出给 Node.js 环境（单元测试用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getStatusText,
    generateId,
    getOwnerId,
    getAllItems,
    saveAllItems,
    addItem,
    getItemById,
    searchItems,
    filterByType,
    filterByOwner,
    updateStatus,
    deleteItem,
    clearAllItems,
    STORAGE_KEY,
    OWNER_KEY
  };
}