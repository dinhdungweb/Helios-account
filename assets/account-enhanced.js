/**
 * Enhanced Account Management System
 * Helios - Advanced Customer Account Features
 */

class HeliosAccountManager {
  constructor() {
    this.init();
    this.bindEvents();
    this.loadUserPreferences();
  }

  init() {
    this.currentTab = 'dashboard';
    this.notifications = [];
    this.wishlist = JSON.parse(localStorage.getItem('helios_wishlist') || '[]');
    this.userSettings = JSON.parse(localStorage.getItem('helios_user_settings') || '{}');
    
    // Initialize components
    this.initDashboard();
    this.initNotifications();
    this.initWishlist();
    this.initOrderManagement();
  }

  bindEvents() {
    // Tab switching
    document.querySelectorAll('.tab-link').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Form submissions
    document.getElementById('accountForm')?.addEventListener('submit', (e) => this.handleAccountUpdate(e));
    
    // Settings toggles
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
      toggle.addEventListener('change', (e) => this.handleSettingChange(e));
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  // Dashboard Management
  initDashboard() {
    this.loadDashboardData();
    this.initCharts();
    this.loadRecentActivities();
  }

  loadDashboardData() {
    // Simulate API call to get dashboard data
    const dashboardData = {
      totalSpent: this.getTotalSpent(),
      orderCount: this.getOrderCount(),
      points: this.getPoints(),
      tier: this.getTier(),
      spendingHistory: this.getSpendingHistory(),
      categoryBreakdown: this.getCategoryBreakdown()
    };

    this.updateDashboardStats(dashboardData);
  }

  initCharts() {
    // Initialize Chart.js charts
    setTimeout(() => {
      this.createSpendingChart();
      this.createCategoryChart();
    }, 100);
  }

  createSpendingChart() {
    const ctx = document.getElementById('spendingChart');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
        datasets: [{
          label: 'Chi tiêu (VND)',
          data: this.getSpendingHistory(),
          borderColor: '#fab320',
          backgroundColor: 'rgba(250, 179, 32, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#fff' }
          }
        },
        scales: {
          y: {
            ticks: { 
              color: '#fff',
              callback: function(value) {
                return new Intl.NumberFormat('vi-VN').format(value) + ' VND';
              }
            },
            grid: { color: '#333' }
          },
          x: {
            ticks: { color: '#fff' },
            grid: { color: '#333' }
          }
        }
      }
    });
  }

  createCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Phụ kiện', 'Trang sức', 'Đồng hồ', 'Khác'],
        datasets: [{
          data: [40, 30, 20, 10],
          backgroundColor: ['#fab320', '#ff6b6b', '#4ecdc4', '#45b7d1'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { 
              color: '#fff',
              padding: 20
            }
          }
        }
      }
    });
  }

  // Notification System
  initNotifications() {
    this.loadNotifications();
    this.setupNotificationPermissions();
  }

  showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.getElementById('notification-system').appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, duration);

    // Store notification
    this.notifications.unshift({
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    });

    this.updateNotificationCount();
  }

  updateNotificationCount() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    const countElement = document.querySelector('.notification-count');
    if (countElement) {
      countElement.textContent = unreadCount;
      countElement.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
  }

  // Wishlist Management
  initWishlist() {
    this.loadWishlist();
  }

  loadWishlist() {
    const container = document.getElementById('wishlistContainer');
    if (!container) return;

    if (this.wishlist.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h4>Danh sách yêu thích trống</h4>
          <p>Thêm sản phẩm yêu thích để dễ dàng mua sắm sau này!</p>
          <a href="/collections/all" class="btn-primary">Khám phá sản phẩm</a>
        </div>
      `;
      return;
    }

    const wishlistHTML = this.wishlist.map(item => `
      <div class="wishlist-item" data-product-id="${item.id}">
        <div class="wishlist-item-image">
          <img src="${item.image}" alt="${item.title}">
        </div>
        <div class="wishlist-item-details">
          <h4>${item.title}</h4>
          <p class="price">${this.formatPrice(item.price)}</p>
          <div class="wishlist-item-actions">
            <button class="btn-primary" onclick="accountManager.addToCart('${item.id}')">
              Thêm vào giỏ
            </button>
            <button class="btn-link danger" onclick="accountManager.removeFromWishlist('${item.id}')">
              Xóa
            </button>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="wishlist-grid">${wishlistHTML}</div>`;
  }

  addToWishlist(productId, productData) {
    if (!this.wishlist.find(item => item.id === productId)) {
      this.wishlist.push({
        id: productId,
        ...productData,
        addedAt: new Date().toISOString()
      });
      
      localStorage.setItem('helios_wishlist', JSON.stringify(this.wishlist));
      this.showNotification('Đã thêm vào danh sách yêu thích!', 'success');
      this.loadWishlist();
    }
  }

  removeFromWishlist(productId) {
    this.wishlist = this.wishlist.filter(item => item.id !== productId);
    localStorage.setItem('helios_wishlist', JSON.stringify(this.wishlist));
    this.showNotification('Đã xóa khỏi danh sách yêu thích', 'info');
    this.loadWishlist();
  }

  // Order Management
  initOrderManagement() {
    this.setupOrderFilters();
    this.loadOrderHistory();
  }

  setupOrderFilters() {
    const statusFilter = document.getElementById('orderStatus');
    const dateFromFilter = document.getElementById('orderDateFrom');
    const dateToFilter = document.getElementById('orderDateTo');

    [statusFilter, dateFromFilter, dateToFilter].forEach(filter => {
      if (filter) {
        filter.addEventListener('change', () => this.filterOrders());
      }
    });
  }

  filterOrders() {
    const status = document.getElementById('orderStatus')?.value;
    const dateFrom = document.getElementById('orderDateFrom')?.value;
    const dateTo = document.getElementById('orderDateTo')?.value;

    const orders = document.querySelectorAll('.order-card');
    
    orders.forEach(order => {
      let show = true;
      
      if (status && !order.dataset.status.includes(status)) {
        show = false;
      }
      
      // Add date filtering logic here
      
      order.style.display = show ? 'block' : 'none';
    });

    this.showNotification('Đã áp dụng bộ lọc', 'success');
  }

  // Account Management
  handleAccountUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const updateData = Object.fromEntries(formData);
    
    // Simulate API call
    setTimeout(() => {
      this.showNotification('Thông tin tài khoản đã được cập nhật!', 'success');
      this.toggleEditMode();
    }, 1000);
  }

  toggleEditMode() {
    const form = document.getElementById('accountForm');
    const inputs = form.querySelectorAll('input:not([type="checkbox"]), select');
    const actions = document.getElementById('formActions');
    
    inputs.forEach(input => {
      if (input.hasAttribute('readonly')) {
        input.removeAttribute('readonly');
      } else {
        input.setAttribute('readonly', true);
      }
      
      if (input.hasAttribute('disabled')) {
        input.removeAttribute('disabled');
      } else {
        input.setAttribute('disabled', true);
      }
    });
    
    actions.style.display = actions.style.display === 'none' ? 'flex' : 'none';
  }

  // Settings Management
  handleSettingChange(e) {
    const setting = e.target.name || e.target.id;
    const value = e.target.checked;
    
    this.userSettings[setting] = value;
    localStorage.setItem('helios_user_settings', JSON.stringify(this.userSettings));
    
    this.showNotification(`Cài đặt "${setting}" đã được ${value ? 'bật' : 'tắt'}`, 'success');
  }

  loadUserPreferences() {
    // Apply user settings
    Object.entries(this.userSettings).forEach(([key, value]) => {
      const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
      if (element && element.type === 'checkbox') {
        element.checked = value;
      }
    });
  }

  // Utility Functions
  switchTab(tabName) {
    if (!tabName) return;
    
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.customer-tab-content').forEach(el => el.classList.remove('active'));
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(tabName);
    
    if (activeTab && activeContent) {
      activeTab.classList.add('active');
      activeContent.classList.add('active');
      this.currentTab = tabName;
      
      // Load tab-specific content
      this.loadTabContent(tabName);
    }
  }

  loadTabContent(tab) {
    switch(tab) {
      case 'dashboard':
        this.initDashboard();
        break;
      case 'wishlist':
        this.loadWishlist();
        break;
      case 'orders':
        this.loadOrderHistory();
        break;
    }
  }

  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + number keys for tab switching
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '8') {
      e.preventDefault();
      const tabs = ['dashboard', 'rewards', 'account', 'orders', 'benefits', 'wishlist', 'discord', 'settings'];
      const tabIndex = parseInt(e.key) - 1;
      if (tabs[tabIndex]) {
        this.switchTab(tabs[tabIndex]);
      }
    }
  }

  // Data getters (these would typically come from API)
  getTotalSpent() {
    return Math.floor(Math.random() * 50000000) + 5000000;
  }

  getOrderCount() {
    return Math.floor(Math.random() * 50) + 10;
  }

  getPoints() {
    return Math.floor(Math.random() * 1000) + 100;
  }

  getTier() {
    const tiers = ['MEMBER', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'BLACK DIAMOND'];
    return tiers[Math.floor(Math.random() * tiers.length)];
  }

  getSpendingHistory() {
    return Array.from({length: 6}, () => Math.floor(Math.random() * 3000000) + 500000);
  }

  getCategoryBreakdown() {
    return [40, 30, 20, 10];
  }

  formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  // Export functions for global access
  exportData() {
    const data = {
      profile: this.userSettings,
      wishlist: this.wishlist,
      notifications: this.notifications,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `helios-account-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('Dữ liệu đã được xuất thành công!', 'success');
  }

  refreshDashboard() {
    this.showNotification('Đang làm mới dashboard...', 'info');
    setTimeout(() => {
      this.loadDashboardData();
      this.showNotification('Dashboard đã được cập nhật!', 'success');
    }, 1500);
  }
}

// Initialize the account manager
let accountManager;
document.addEventListener('DOMContentLoaded', function() {
  accountManager = new HeliosAccountManager();
});

// Global functions for template access
function toggleEditMode() {
  accountManager.toggleEditMode();
}

function cancelEdit() {
  location.reload();
}

function openAvatarUpload() {
  accountManager.showNotification('Tính năng upload avatar sẽ sớm có!', 'info');
}

function toggleNotifications() {
  accountManager.showNotification('Bạn có 3 thông báo mới!', 'info');
}

function filterOrders() {
  accountManager.filterOrders();
}

function viewOrderDetails(url) {
  window.open(url, '_blank');
}

function reorder(orderId) {
  accountManager.showNotification('Đã thêm sản phẩm vào giỏ hàng!', 'success');
}

function cancelOrder(orderId) {
  if (confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
    accountManager.showNotification('Đơn hàng đã được hủy', 'success');
  }
}

function trackOrder(orderId) {
  accountManager.showNotification('Mở trang theo dõi đơn hàng...', 'info');
}

function writeReview(orderId) {
  accountManager.showNotification('Mở form đánh giá sản phẩm...', 'info');
}

function clearWishlist() {
  if (confirm('Bạn có chắc muốn xóa tất cả sản phẩm yêu thích?')) {
    accountManager.wishlist = [];
    localStorage.removeItem('helios_wishlist');
    accountManager.loadWishlist();
    accountManager.showNotification('Đã xóa tất cả sản phẩm yêu thích', 'success');
  }
}

function shareWishlist() {
  accountManager.showNotification('Tính năng chia sẻ wishlist sẽ sớm có!', 'info');
}

function exportAccountData() {
  accountManager.exportData();
}

function deleteAccount() {
  if (confirm('CẢNH BÁO: Hành động này không thể hoàn tác. Bạn có chắc muốn xóa tài khoản?')) {
    accountManager.showNotification('Yêu cầu xóa tài khoản đã được gửi', 'warning');
  }
}

function exportOrders() {
  accountManager.showNotification('Đang xuất dữ liệu đơn hàng...', 'info');
}

function addNewAddress() {
  accountManager.showNotification('Mở form thêm địa chỉ mới...', 'info');
}

function editAddress(addressId) {
  accountManager.showNotification(`Chỉnh sửa địa chỉ ${addressId}...`, 'info');
}

function deleteAddress(addressId) {
  if (confirm('Bạn có chắc muốn xóa địa chỉ này?')) {
    accountManager.showNotification('Địa chỉ đã được xóa', 'success');
  }
}

function changePassword() {
  accountManager.showNotification('Mở form đổi mật khẩu...', 'info');
}

function setup2FA() {
  accountManager.showNotification('Thiết lập xác thực 2 bước...', 'info');
}

function exportData() {
  accountManager.exportData();
}

function refreshDashboard() {
  accountManager.refreshDashboard();
}