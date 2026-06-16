// Bravehearts Basketball Club - Admin Application

import { renderAdminLogin } from './components/admin-login.js';
import { renderAdminDashboard } from './components/admin/dashboard.js';
import { renderOrdersList, renderOrderDetail } from './components/admin/orders-list.js';
import { renderProductsList, renderProductForm } from './components/admin/products-list.js';
import { renderUsersList, renderUserDetail } from './components/admin/users-list.js';
import { renderAnalyticsDashboard, initTrendChart } from './components/admin/analytics.js';
import { renderSchedulesList, renderScheduleForm } from './components/admin/schedules-list.js';
import { renderGameStatsManager, renderAddPlayerModal } from './components/admin/game-stats.js';
import { renderRosterList, renderPlayerForm } from './components/admin/roster-list.js';
import { getPlayerImageUrl } from './components/roster.js';
import { renderNewsManager } from './components/admin/news-manager.js';
import { renderStandingsManager } from './components/admin/standings-manager.js';
import { renderGalleryManager } from './components/admin/gallery-manager.js';
import { renderNotificationManager } from './components/admin/notification-manager.js';
import { getYouTubeEmbedUrl } from './youtube.js';

import {
  fetchNews,
  fetchPolls,
  fetchGallery,
  fetchStandings,
  fetchNotifications
} from './api.js';

import { 
  adminLogin, 
  adminLogout, 
  fetchDashboardStats, 
  fetchRecentOrders, 
  fetchAllOrders, 
  fetchOrderDetail, 
  updateOrderStatus, 
  fetchAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  fetchAllUsers,
  fetchUserDetail,
  updateUserSubscription,
  fetchRevenueTrend,
  fetchPaymentMethods,
  fetchSalesByCategory,
  fetchAllGames,
  fetchGameDetail,
  createGame,
  updateGame,
  deleteGame,
  fetchGameStats,
  createPlayerStat,
  updatePlayerStat,
  deletePlayerStat,
  updateGameScore,
  importGameStatsFile,
  fetchAllPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  createNews,
  updateNews,
  deleteNews,
  createGalleryItem,
  deleteGalleryItem,
  createStandingsEntry,
  updateStandingsEntry,
  deleteStandingsEntry,
  clearStandingsTable,
  importStandingsFile,
  createPoll,
  updatePollStatus,
  deletePoll,
  createNotification,
  banUser,
  uploadImage,
  exportReport
} from './admin-api.js';


function showAdminDialog({ title = 'Notice', message = '', type = 'info', confirmText = 'OK', cancelText = null } = {}) {
  return new Promise(resolve => {
    const existing = document.querySelector('.app-dialog-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'app-dialog-backdrop';
    const icon = type === 'error' ? 'alert-triangle' : type === 'warning' ? 'alert-circle' : type === 'success' ? 'check-circle' : 'info';
    backdrop.innerHTML = `
      <div class="app-dialog-card glass" role="dialog" aria-modal="true">
        <h3><i data-lucide="${icon}" style="width:20px;height:20px;vertical-align:middle;margin-right:8px;color:var(--color-accent);"></i>${title}</h3>
        <p>${message}</p>
        <div class="app-dialog-actions">
          ${cancelText ? `<button class="btn btn-secondary" data-dialog-cancel>${cancelText}</button>` : ''}
          <button class="btn btn-primary" data-dialog-confirm>${confirmText}</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    if (window.lucide) window.lucide.createIcons();

    const close = value => {
      backdrop.remove();
      resolve(value);
    };
    backdrop.querySelector('[data-dialog-confirm]')?.addEventListener('click', () => close(true));
    backdrop.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => close(false));
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop && cancelText) close(false);
    });
  });
}

const adminNotify = (message, title = 'Notice', type = 'info') => showAdminDialog({ title, message, type });
const adminAsk = (message, title = 'Please confirm') => showAdminDialog({ title, message, type: 'warning', confirmText: 'Continue', cancelText: 'Cancel' });

// Admin State
const adminState = {
  sessionId: localStorage.getItem('admin_session_id') || null,
  adminEmail: localStorage.getItem('admin_email') || null,
  adminRole: localStorage.getItem('admin_role') || null,
  theme: localStorage.getItem('admin_theme') || 'dark',
  currentView: 'dashboard',
  currentOrderId: null,
  currentProductId: null,
  currentUserId: null,
  currentGameId: null,
  currentPlayerId: null,
  dashboardStats: {},
  allOrders: [],
  allProducts: [],
  allUsers: [],
  allGames: [],
  allPlayers: [],
  selectedOrderStatus: null,
  selectedGameStatus: null,
  selectedTeamFilter: 'all',
  selectedStandingCategory: localStorage.getItem('admin_standing_category') || 'men',
  selectedStandingSeason: localStorage.getItem('admin_standing_season') || '2025/2026'
};

// Apply theme immediately to prevent flash
if (adminState.theme === 'light') {
  document.body.classList.add('light-theme');
}

// Initialize Admin App
async function initAdminApp() {
  const root = document.getElementById('app');

  if (!adminState.sessionId || !adminState.adminEmail) {
    const hash = window.location.hash || '#/admin-login';
    const urlParams = new URLSearchParams(hash.split('?')[1] || '');
    const resetToken = urlParams.get('token') || '';
    const isForgot = hash.includes('forgot-password');
    const isReset = !!resetToken;

    let mode = 'login';
    if (isForgot) mode = 'forgot';
    if (isReset) mode = 'reset';

    root.innerHTML = `
      <header class="admin-header">
        <div class="admin-header-content">
          <a href="#/" class="logo-wrapper" title="Back to Main Site">
            <div class="logo-icon"><img src="./src/assets/logo.png" alt="Bravehearts Logo"></div>
            <div class="logo-text">Brave<span>hearts</span> <span style="font-size: 0.8rem; opacity: 0.7;">Admin</span></div>
          </a>
        </div>
      </header>
      <main id="main-content">${renderAdminLogin(mode, null, resetToken)}</main>
    `;

    applyTheme();
    setupLoginListeners();
    return;
  }

  // Show dashboard/management page
  root.innerHTML = `
    <header class="admin-header">
      <div class="admin-header-content">
        <a href="#/" class="logo-wrapper" title="Back to Main Site">
          <div class="logo-icon"><img src="./src/assets/logo.png" alt="Bravehearts Logo"></div>
          <div class="logo-text">Brave<span>hearts</span> <span style="font-size: 0.8rem; opacity: 0.7;">Admin</span></div>
        </a>
        <button class="mobile-nav-toggle" id="admin-menu-toggle" aria-label="Toggle Menu">
          <i data-lucide="menu"></i>
        </button>
        <div class="admin-nav-container" id="admin-nav-container">
          <div class="admin-nav">
            <a href="#/admin/dashboard" class="admin-nav-link" data-view="dashboard">Dashboard</a>
            <a href="#/admin/orders" class="admin-nav-link" data-view="orders">Orders</a>
            <a href="#/admin/products" class="admin-nav-link" data-view="products">Products</a>
            <a href="#/admin/schedules" class="admin-nav-link" data-view="schedules">Schedules</a>
            <a href="#/admin/rosters" class="admin-nav-link" data-view="rosters">Rosters</a>
            <a href="#/admin/users" class="admin-nav-link" data-view="users">Users</a>
            <a href="#/admin/news" class="admin-nav-link" data-view="news">News & Polls</a>
            <a href="#/admin/standings" class="admin-nav-link" data-view="standings">Standings</a>
            <a href="#/admin/gallery" class="admin-nav-link" data-view="gallery">Gallery</a>
            <a href="#/admin/notifications" class="admin-nav-link" data-view="notifications">Notifications</a>
            <a href="#/admin/analytics" class="admin-nav-link" data-view="analytics">Analytics</a>
          </div>

          <div class="admin-user">
            <button id="admin-theme-toggle-btn" class="btn btn-secondary btn-sm" type="button" title="Toggle light mode" aria-label="Toggle light mode">
              <i data-lucide="${adminState.theme === 'light' ? 'moon' : 'sun'}" style="width: 16px; height: 16px;"></i>
            </button>
            <button id="admin-logout-btn" class="btn btn-secondary btn-sm">Logout</button>
          </div>
        </div>
      </div>
    </header>
    <main id="main-content" style="padding: 40px 20px; max-width: 1400px; margin: 0 auto;"></main>
  `;

  applyTheme();
  
  // Parse hash route
  const hash = window.location.hash || '#/admin/dashboard';
  const parts = hash.split('/').filter(p => p && p !== '#');
  let viewPath = 'dashboard';
  let subPath = null;
  
  // Extract view and ID from URL
  if (parts[0] === 'admin' && parts[1]) {
    viewPath = parts[1];
    if (parts[2]) {
      if (parts[1] === 'orders') {
        adminState.currentOrderId = parts[2];
      } else if (parts[1] === 'products') {
        adminState.currentProductId = parts[2];
      } else if (parts[1] === 'users') {
        adminState.currentUserId = parts[2];
      } else if (parts[1] === 'schedules') {
        adminState.currentGameId = parts[2];
        if (parts[3]) {
          subPath = parts[3]; // 'stats' for game stats management
        }
      } else if (parts[1] === 'rosters') {
        adminState.currentPlayerId = parts[2];
      }
    } else {
      adminState.currentOrderId = null;
      adminState.currentProductId = null;
      adminState.currentUserId = null;
      adminState.currentGameId = null;
      adminState.currentPlayerId = null;
    }
  } else {
    adminState.currentOrderId = null;
    adminState.currentProductId = null;
    adminState.currentUserId = null;
    adminState.currentGameId = null;
    adminState.currentPlayerId = null;
  }

  // Highlight active nav link
  document.querySelectorAll('.admin-nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.view === viewPath);
  });

  // Route to appropriate view
  if (viewPath === 'dashboard') {
    adminState.currentView = 'dashboard';
    adminState.selectedOrderStatus = null;
    await loadDashboard();
  } else if (viewPath === 'orders') {
    if (adminState.currentOrderId) {
      adminState.currentView = 'orders-detail';
      await loadOrderDetail(adminState.currentOrderId);
    } else {
      adminState.currentView = 'orders';
      await loadOrders();
    }
  } else if (viewPath === 'products') {
    if (adminState.currentProductId === 'new') {
      adminState.currentView = 'products-form';
      await loadProductForm(null);
    } else if (adminState.currentProductId) {
      adminState.currentView = 'products-form';
      await loadProductForm(adminState.currentProductId);
    } else {
      adminState.currentView = 'products';
      adminState.selectedOrderStatus = null; // Reset filter when leaving orders
      await loadProducts();
    }
  } else if (viewPath === 'schedules') {
    if (subPath === 'stats') {
      adminState.currentView = 'game-stats';
      await loadGameStats(adminState.currentGameId);
    } else if (adminState.currentGameId === 'new') {
      adminState.currentView = 'schedules-form';
      await loadScheduleForm(null);
    } else if (adminState.currentGameId) {
      adminState.currentView = 'schedules-form';
      await loadScheduleForm(adminState.currentGameId);
    } else {
      adminState.currentView = 'schedules';
      await loadSchedules();
    }
  } else if (viewPath === 'rosters') {
    if (adminState.currentPlayerId === 'new') {
      adminState.currentView = 'rosters-form';
      await loadPlayerForm(null);
    } else if (adminState.currentPlayerId) {
      adminState.currentView = 'rosters-form';
      await loadPlayerForm(adminState.currentPlayerId);
    } else {
      adminState.currentView = 'rosters';
      await loadRosters();
    }
  } else if (viewPath === 'users') {
    if (adminState.currentUserId) {
      adminState.currentView = 'users-detail';
      await loadUserDetail(adminState.currentUserId);
    } else {
      adminState.currentView = 'users';
      await loadUsers();
    }
  } else if (viewPath === 'news') {
    adminState.currentView = 'news';
    await loadNews();
  } else if (viewPath === 'standings') {
    adminState.currentView = 'standings';
    await loadStandings();
  } else if (viewPath === 'gallery') {
    adminState.currentView = 'gallery';
    await loadGallery();
  } else if (viewPath === 'notifications') {
    adminState.currentView = 'notifications';
    await loadNotifications();
  } else if (viewPath === 'analytics') {
    adminState.currentView = 'analytics';
    await loadAnalytics();
  }


  // Setup event listeners
  document.getElementById('admin-logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('admin-theme-toggle-btn')?.addEventListener('click', toggleAdminTheme);
  
  const menuToggle = document.getElementById('admin-menu-toggle');
  const navContainer = document.getElementById('admin-nav-container');

  menuToggle?.addEventListener('click', () => {
    navContainer?.classList.toggle('open');
    const isOpen = navContainer?.classList.contains('open');
    menuToggle.innerHTML = isOpen ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = e.target.closest('[data-view]').dataset.view;
      window.location.hash = `#/admin/${view}`;
      
      // Close mobile menu on navigation
      navContainer?.classList.remove('open');
      if (menuToggle) {
        menuToggle.innerHTML = '<i data-lucide="menu"></i>';
        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    });
  });
}

function applyTheme() {
  document.body.classList.toggle('light-theme', adminState.theme === 'light');
  const themeBtn = document.getElementById('admin-theme-toggle-btn');
  const icon = themeBtn?.querySelector('i');
  if (icon) {
    icon.setAttribute('data-lucide', adminState.theme === 'light' ? 'moon' : 'sun');
  }
  if (window.lucide) window.lucide.createIcons();
}

function toggleAdminTheme() {
  adminState.theme = adminState.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('admin_theme', adminState.theme);
  applyTheme();
}

async function loadDashboard() {
  try {
    const stats = await fetchDashboardStats(adminState.sessionId);
    const ordersResponse = await fetchRecentOrders(adminState.sessionId, 5);

    adminState.dashboardStats = {
      ...stats,
      recentOrders: ordersResponse.orders || []
    };

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = renderAdminDashboard(adminState.dashboardStats);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Setup export buttons
      document.querySelectorAll('.export-report-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const type = e.target.closest('[data-type]').dataset.type;
          try {
            await exportReport(adminState.sessionId, type);
          } catch (error) {
            alert(error.message);
          }
        });
      });
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    alert('Failed to load dashboard. Please try again.');
  }
}

async function loadOrders() {
  try {
    const response = await fetchAllOrders(adminState.sessionId, adminState.selectedOrderStatus);
    adminState.allOrders = response.orders || [];

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      // Determine current filter display value
      const currentFilter = adminState.selectedOrderStatus || 'all';
      mainContent.innerHTML = renderOrdersList(adminState.allOrders, currentFilter);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Setup export buttons
      document.querySelectorAll('.export-report-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const type = e.target.closest('[data-type]').dataset.type;
          try {
            await exportReport(adminState.sessionId, type);
          } catch (error) {
            alert(error.message);
          }
        });
      });

      // Setup filter buttons
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const filter = btn.dataset.filter;
          adminState.selectedOrderStatus = filter === 'all' ? null : filter;
          await loadOrders();
        });
      });

      // Setup view order buttons
      document.querySelectorAll('.view-order-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const orderId = e.target.closest('[data-order-id]').dataset.orderId;
          window.location.hash = `#/admin/orders/${orderId}`;
        });
      });
    }
  } catch (error) {
    console.error('Failed to load orders:', error);
    alert('Failed to load orders. Please try again.');
  }
}


async function loadOrderDetail(orderId) {
  try {
    const response = await fetchOrderDetail(adminState.sessionId, orderId);
    const mainContent = document.getElementById('main-content');
    
    if (mainContent) {
      mainContent.innerHTML = renderOrderDetail(response.order);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Setup back button
      document.getElementById('back-to-orders')?.addEventListener('click', () => {
        window.location.hash = '#/admin/orders';
      });

      // Setup status update
      document.getElementById('update-status-btn')?.addEventListener('click', async () => {
        const newStatus = document.getElementById('status-select').value;
        try {
          await updateOrderStatus(adminState.sessionId, orderId, newStatus);
          alert('Order status updated successfully!');
          await loadOrderDetail(orderId);
        } catch (error) {
          alert(error.message);
        }
      });
    }
  } catch (error) {
    console.error('Failed to load order detail:', error);
    alert('Failed to load order. Please try again.');
  }
}

async function loadProducts() {
  try {
    const response = await fetchAllProducts(adminState.sessionId);
    adminState.allProducts = response.products || [];

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const isSuperAdmin = adminState.adminRole === 'super-admin';
      mainContent.innerHTML = renderProductsList(adminState.allProducts, isSuperAdmin);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Setup add product button
      document.getElementById('add-product-btn')?.addEventListener('click', () => {
        window.location.hash = '#/admin/products/new';
      });

      // Setup edit buttons
      document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const productId = e.target.closest('[data-product-id]').dataset.productId;
          window.location.hash = `#/admin/products/${productId}`;
        });
      });

      // Setup delete buttons
      document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const productId = e.target.closest('[data-product-id]').dataset.productId;
          if (confirm('Are you sure you want to delete this product?')) {
            try {
              await deleteProduct(adminState.sessionId, productId);
              alert('Product deleted successfully!');
              await loadProducts();
            } catch (error) {
              alert(error.message);
            }
          }
        });
      });
    }
  } catch (error) {
    console.error('Failed to load products:', error);
    alert('Failed to load products. Please try again.');
  }
}

async function loadProductForm(productId) {
  try {
    let product = null;
    if (productId && productId !== 'new') {
      product = adminState.allProducts.find(p => p.id === productId);
      if (!product) {
        alert('Product not found.');
        window.location.hash = '#/admin/products';
        return;
      }
    }

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = renderProductForm(product);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Setup image upload
      const fileInput = document.getElementById('product-image-file');
      const uploadBtn = document.getElementById('upload-product-image-btn');
      uploadBtn?.addEventListener('click', () => fileInput.click());

      fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = reader.result.split(',')[1];
            const response = await uploadImage(adminState.sessionId, file.name, base64Data);
            document.getElementById('product-image-url').value = response.url;
            alert('Image uploaded successfully!');
          } catch (error) {
            alert('Upload failed: ' + error.message);
          }
        };
        reader.readAsDataURL(file);
      });

      // Setup form
      const form = document.getElementById('product-form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
          title: document.getElementById('product-title').value,
          sku: document.getElementById('product-sku').value,
          category: document.getElementById('product-category').value,
          price_mwk: parseInt(document.getElementById('product-price-mwk').value),
          price_usd: parseFloat(document.getElementById('product-price-usd').value),
          image_url: document.getElementById('product-image-url').value.trim(),
          description: document.getElementById('product-description').value,
          is_new: document.getElementById('product-is-new').checked
        };

        try {
          if (product) {
            await updateProduct(adminState.sessionId, product.id, formData);
            alert('Product updated successfully!');
          } else {
            await createProduct(adminState.sessionId, formData);
            alert('Product created successfully!');
          }
          window.location.hash = '#/admin/products';
        } catch (error) {
          alert(error.message);
        }
      });

      // Setup cancel button
      document.getElementById('cancel-form-btn')?.addEventListener('click', () => {
        window.location.hash = '#/admin/products';
      });

      // Setup back button
      document.getElementById('back-to-products')?.addEventListener('click', () => {
        window.location.hash = '#/admin/products';
      });
    }
  } catch (error) {
    console.error('Failed to load product form:', error);
    alert('Failed to load product form. Please try again.');
  }
}


async function loadUsers() {
  try {
    const response = await fetchAllUsers(adminState.sessionId);
    adminState.allUsers = response.users || [];

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const isSuperAdmin = adminState.adminRole === 'super-admin';
      mainContent.innerHTML = renderUsersList(adminState.allUsers, isSuperAdmin);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Setup export buttons
      document.querySelectorAll('.export-report-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const type = e.target.closest('[data-type]').dataset.type;
          try {
            await exportReport(adminState.sessionId, type);
          } catch (error) {
            alert(error.message);
          }
        });
      });

      // Setup view user buttons
      document.querySelectorAll('.view-user-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const userId = e.target.closest('[data-user-id]').dataset.userId;
          window.location.hash = `#/admin/users/${userId}`;
        });
      });

      // Setup toggle ban buttons
      document.querySelectorAll('.toggle-ban-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const userId = e.target.dataset.userId;
          const isBanned = e.target.dataset.isBanned === 'true';
          const actionText = isBanned ? 'unban' : 'ban';
          if (confirm(`Are you sure you want to ${actionText} this user?`)) {
            try {
              await banUser(adminState.sessionId, userId, !isBanned);
              alert(`User ${isBanned ? 'unbanned' : 'banned'} successfully!`);
              await loadUsers();
            } catch (error) {
              alert(error.message);
            }
          }
        });
      });
    }
  } catch (error) {
    console.error('Failed to load users:', error);
    alert('Failed to load users. Please try again.');
  }
}

async function loadUserDetail(userId) {
  try {
    const response = await fetchUserDetail(adminState.sessionId, userId);
    const mainContent = document.getElementById('main-content');

    if (mainContent) {
      mainContent.innerHTML = renderUserDetail(response.user);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Setup back button
      document.getElementById('back-to-users')?.addEventListener('click', () => {
        window.location.hash = '#/admin/users';
      });

      // Setup subscription update
      document.getElementById('update-subscription-btn')?.addEventListener('click', async () => {
        const newStatus = document.getElementById('subscription-select').value;
        try {
          await updateUserSubscription(adminState.sessionId, userId, newStatus);
          alert('Subscription updated successfully!');
          await loadUserDetail(userId);
        } catch (error) {
          alert(error.message);
        }
      });

      // Setup toggle ban button
      document.getElementById('detail-toggle-ban-btn')?.addEventListener('click', async (e) => {
        const userId = e.target.dataset.userId;
        const isBanned = e.target.dataset.isBanned === 'true';
        const actionText = isBanned ? 'unban' : 'ban';
        if (confirm(`Are you sure you want to ${actionText} this user?`)) {
          try {
            await banUser(adminState.sessionId, userId, !isBanned);
            alert(`User ${isBanned ? 'unbanned' : 'banned'} successfully!`);
            await loadUserDetail(userId);
          } catch (error) {
            alert(error.message);
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to load user detail:', error);
    alert('Failed to load user details. Please try again.');
  }
}


async function loadAnalytics() {
  try {
    const [trendResponse, methodsResponse, categoryResponse] = await Promise.all([
      fetchRevenueTrend(adminState.sessionId),
      fetchPaymentMethods(adminState.sessionId),
      fetchSalesByCategory(adminState.sessionId)
    ]);

    const analyticsData = {
      revenueTrend: trendResponse.trend || [],
      paymentMethods: methodsResponse.methods || [],
      salesByCategory: categoryResponse.categories || []
    };

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = renderAnalyticsDashboard(analyticsData);
      if (window.lucide) {
        window.lucide.createIcons();
      }
      // Mount Chart.js graph after the DOM element exists
      initTrendChart(analyticsData.revenueTrend);
    }
  } catch (error) {
    console.error('Failed to load analytics:', error);
    alert('Failed to load analytics. Please try again.');
  }
}

async function loadSchedules() {
  try {
    const response = await fetchAllGames(adminState.sessionId);
    adminState.allGames = response.games || [];
    adminState.selectedGameStatus = adminState.selectedGameStatus || 'all';

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const filteredGames = adminState.selectedGameStatus === 'all' 
        ? adminState.allGames 
        : adminState.allGames.filter(g => g.status === adminState.selectedGameStatus);
      
      mainContent.innerHTML = renderSchedulesList(filteredGames, adminState.selectedGameStatus);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Setup export buttons
      document.querySelectorAll('.export-report-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const type = e.target.closest('[data-type]').dataset.type;
          try {
            await exportReport(adminState.sessionId, type);
          } catch (error) {
            alert(error.message);
          }
        });
      });

      // Setup filter buttons
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          adminState.selectedGameStatus = btn.dataset.filter || 'all';
          await loadSchedules();
        });
      });

      // Setup add game button
      document.getElementById('add-game-btn')?.addEventListener('click', () => {
        window.location.hash = '#/admin/schedules/new';
      });

      // Setup edit/delete buttons
      document.querySelectorAll('.edit-game-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const gameId = e.target.closest('[data-game-id]').dataset.gameId;
          window.location.hash = `#/admin/schedules/${gameId}`;
        });
      });

      document.querySelectorAll('.delete-game-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const gameId = e.target.closest('[data-game-id]').dataset.gameId;
          if (confirm('Are you sure you want to delete this game?')) {
            try {
              await deleteGame(adminState.sessionId, gameId);
              await loadSchedules();
            } catch (error) {
              alert(error.message);
            }
          }
        });
      });

      // Setup live stats button (added from game-stats-manager)
      document.querySelectorAll('.live-stats-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const gameId = e.target.closest('[data-game-id]').dataset.gameId;
          window.location.hash = `#/admin/schedules/${gameId}/stats`;
        });
      });
    }
  } catch (error) {
    console.error('Failed to load schedules:', error);
    alert('Failed to load schedules. Please try again.');
  }
}

async function loadScheduleForm(gameId) {
  try {
    let game = null;
    if (gameId) {
      const response = await fetchGameDetail(adminState.sessionId, gameId);
      game = response.game;
    }

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = renderScheduleForm(game);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Toggle score section based on status selection
      const statusSelect = document.getElementById('game-status');
      const scoreSection = document.getElementById('score-section');
      statusSelect?.addEventListener('change', () => {
        if (['live', 'result'].includes(statusSelect.value)) {
          scoreSection.style.display = 'block';
        } else {
          scoreSection.style.display = 'none';
        }
      });

      // Setup back button
      document.getElementById('back-to-schedules')?.addEventListener('click', () => {
        window.location.hash = '#/admin/schedules';
      });

      // Setup opponent logo upload
      const opponentLogoUploadBtn = document.getElementById('upload-opponent-logo-btn');
      const opponentLogoFileInput = document.getElementById('opponent-logo-file');
      opponentLogoUploadBtn?.addEventListener('click', () => opponentLogoFileInput?.click());
      opponentLogoFileInput?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64Data = String(reader.result).split(',')[1] || reader.result;
              const response = await uploadImage(adminState.sessionId, file.name, base64Data);
              document.getElementById('game-opponent-logo-url').value = response.imageUrl || response.url;
              alert('Opponent logo uploaded successfully! Save the game to publish it.');
            } catch (error) {
              alert(`Upload failed: ${error.message}`);
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          alert(`Upload failed: ${error.message}`);
        }
      });

      // Setup form submission
      document.getElementById('game-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusValue = document.getElementById('game-status').value;
        const ourScoreVal = document.getElementById('game-our-score').value;
        const opponentScoreVal = document.getElementById('game-opponent-score').value;

        const formData = {
          tournament: document.getElementById('game-tournament').value,
          opponent: document.getElementById('game-opponent').value,
          opponent_origin: document.getElementById('game-opponent-origin').value,
          team: document.getElementById('game-team').value,
          game_date: document.getElementById('game-date').value,
          game_time: document.getElementById('game-time').value || null,
          venue: document.getElementById('game-venue').value || null,
          opponent_logo_url: document.getElementById('game-opponent-logo-url').value || null,
          is_home: document.getElementById('game-is-home').checked,
          status: statusValue,
          our_score: ['live', 'result'].includes(statusValue) && ourScoreVal !== '' ? parseInt(ourScoreVal) : null,
          opponent_score: ['live', 'result'].includes(statusValue) && opponentScoreVal !== '' ? parseInt(opponentScoreVal) : null,
          outcome: ['live', 'result'].includes(statusValue) ? (document.getElementById('game-outcome').value || null) : null,
          notes: document.getElementById('game-notes').value || null
        };

        try {
          if (gameId) {
            await updateGame(adminState.sessionId, gameId, formData);
          } else {
            await createGame(adminState.sessionId, formData);
          }
          window.location.hash = '#/admin/schedules';
        } catch (error) {
          alert(error.message);
        }
      });
    }
  } catch (error) {
    console.error('Failed to load schedule form:', error);
    alert('Failed to load schedule form. Please try again.');
  }
}

async function loadGameStats(gameId) {
  try {
    const [gameResponse, statsResponse, playersResponse] = await Promise.all([
      fetchGameDetail(adminState.sessionId, gameId),
      fetchGameStats(adminState.sessionId, gameId),
      fetchAllPlayers(adminState.sessionId)
    ]);

    adminState.currentGame = gameResponse.game;
    adminState.gameStats = statsResponse.stats || [];
    adminState.allPlayers = playersResponse.players || [];

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const playerProfilesByNumber = new Map(
        adminState.allPlayers.map(player => [String(player.number), player])
      );
      const gameStatsWithImages = adminState.gameStats.map(stat => {
        const profile = playerProfilesByNumber.get(String(stat.player_number));
        const playerForImage = {
          ...profile,
          ...stat,
          name: stat.player_name || profile?.name,
          number: stat.player_number || profile?.number,
          team: adminState.currentGame?.team || profile?.team || 'men'
        };
        return {
          ...stat,
          image_url: stat.image_url || profile?.image_url || profile?.photo_url || getPlayerImageUrl(playerForImage)
        };
      });

      mainContent.innerHTML = renderGameStatsManager(adminState.currentGame, gameStatsWithImages);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      setupGameStatsListeners(gameId);
    }
  } catch (error) {
    console.error('Failed to load game stats:', error);
    alert('Failed to load game stats. Please try again.');
  }
}

function setupGameStatsListeners(gameId) {
  const statsImportBtn = document.getElementById('game-stats-import-btn');
  const statsImportFile = document.getElementById('game-stats-import-file');
  statsImportBtn?.addEventListener('click', () => statsImportFile?.click());
  statsImportFile?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const response = await importGameStatsFile(adminState.sessionId, gameId, file);
      const summary = response.summary || {};
      const warningText = response.warnings?.length ? ` Warnings: ${response.warnings.length}.` : '';
      await adminNotify(`Imported ${summary.importedRows || 0} player stat rows.${warningText}`, 'Import complete', 'success');
      await loadGameStats(gameId);
    } catch (error) {
      await adminNotify(error.message, 'Stats import failed', 'error');
    } finally {
      event.target.value = '';
    }
  });

  // Back button
  document.getElementById('back-to-schedules')?.addEventListener('click', () => {
    window.location.hash = '#/admin/schedules';
  });

  // Add player button
  document.getElementById('add-player-btn')?.addEventListener('click', () => {
    // Filter to only show players from the game's team, and exclude already-added players
    const gameTeam = adminState.currentGame?.team || 'men';
    const addedPlayerNumbers = adminState.gameStats.map(s => s.player_number);
    const availablePlayers = adminState.allPlayers
      .filter(p => p.team === gameTeam)
      .filter(p => !addedPlayerNumbers.includes(p.number));

    const modal = document.createElement('div');
    modal.innerHTML = renderAddPlayerModal(availablePlayers);
    document.body.appendChild(modal);

    // Close modal
    document.querySelector('.close-modal-btn')?.addEventListener('click', () => {
      modal.remove();
    });

    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => {
      modal.remove();
    });

    // Add player
    document.getElementById('modal-add-player-btn')?.addEventListener('click', async () => {
      const selectElement = document.getElementById('modal-player-select');
      const selectedValue = selectElement.value;

      if (!selectedValue) {
        alert('Please select a player.');
        return;
      }

      const [playerNumberStr, playerName] = selectedValue.split('|');
      const playerNumber = parseInt(playerNumberStr);

      try {
        await createPlayerStat(adminState.sessionId, gameId, { player_number: playerNumber, player_name: playerName });
        modal.remove();
        await loadGameStats(gameId);
      } catch (error) {
        alert(error.message);
      }
    });
  });

  // Stat updates: keep the field focused while typing; save only when the user is done.
  document.querySelectorAll('.stat-input').forEach(input => {
    const saveStatInput = async (target) => {
      const statId = target.dataset.playerId;
      const statType = target.classList[1];
      const value = target.value === '' ? 0 : parseInt(target.value, 10) || 0;

      if (target.value === '') {
        target.value = value;
      }

      const updateData = { [statType]: value };
      const row = target.closest('.player-stat-row');

      if (['two_points_made', 'three_points_made', 'free_throws_made'].includes(statType)) {
        const twoPointsMade = parseInt(row.querySelector('.two_points_made')?.value, 10) || 0;
        const threePointsMade = parseInt(row.querySelector('.three_points_made')?.value, 10) || 0;
        const freeThrowsMade = parseInt(row.querySelector('.free_throws_made')?.value, 10) || 0;
        const calculatedPoints = (twoPointsMade * 2) + (threePointsMade * 3) + freeThrowsMade;
        const calculatedFieldGoalsMade = twoPointsMade + threePointsMade;
        updateData.points = calculatedPoints;
        if (['two_points_made', 'three_points_made'].includes(statType)) {
          updateData.field_goals_made = calculatedFieldGoalsMade;
        }
        const pointsInput = row.querySelector('.points');
        const fieldGoalsMadeInput = row.querySelector('.field_goals_made');
        if (pointsInput && pointsInput !== target) pointsInput.value = calculatedPoints;
        if (fieldGoalsMadeInput && fieldGoalsMadeInput !== target && ['two_points_made', 'three_points_made'].includes(statType)) fieldGoalsMadeInput.value = calculatedFieldGoalsMade;
      }

      if (['two_points_attempted', 'three_points_attempted'].includes(statType)) {
        const twoPointsAttempted = parseInt(row.querySelector('.two_points_attempted')?.value, 10) || 0;
        const threePointsAttempted = parseInt(row.querySelector('.three_points_attempted')?.value, 10) || 0;
        const calculatedFieldGoalAttempts = twoPointsAttempted + threePointsAttempted;
        updateData.field_goals_attempted = calculatedFieldGoalAttempts;
        const fieldGoalAttemptsInput = row.querySelector('.field_goals_attempted');
        if (fieldGoalAttemptsInput && fieldGoalAttemptsInput !== target) fieldGoalAttemptsInput.value = calculatedFieldGoalAttempts;
      }

      if (['offensive_rebounds', 'defensive_rebounds'].includes(statType)) {
        const offensiveRebounds = parseInt(row.querySelector('.offensive_rebounds')?.value, 10) || 0;
        const defensiveRebounds = parseInt(row.querySelector('.defensive_rebounds')?.value, 10) || 0;
        updateData.rebounds = offensiveRebounds + defensiveRebounds;
      }

      try {
        await updatePlayerStat(adminState.sessionId, statId, updateData);
      } catch (error) {
        console.error('Failed to update stat:', error);
        alert('Failed to save stat. Please try again.');
      }
    };

    input.addEventListener('focus', (e) => {
      e.target.dataset.originalValue = e.target.value;
      e.target.select();
    });

    input.addEventListener('blur', async (e) => {
      await saveStatInput(e.target);
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.target.value = e.target.dataset.originalValue || '0';
        e.target.blur();
      }
    });
  });

  // Player name updates
  document.querySelectorAll('.player-name-input').forEach(input => {
    input.addEventListener('input', async (e) => {
      const statId = e.target.dataset.playerId;
      const name = e.target.value;

      try {
        await updatePlayerStat(adminState.sessionId, statId, { player_name: name });

    // Auto-set to 0 if field is left blank
    input.addEventListener('blur', (e) => {
      if (e.target.value === '' || e.target.value === null || e.target.value === undefined) {
        e.target.value = 0;
      }
    });
      } catch (error) {
        console.error('Failed to update player name:', error);
      }
    });
  });

  // Delete player button
  document.querySelectorAll('.delete-player-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const statId = e.target.closest('[data-player-id]').dataset.playerId;
      if (confirm('Remove this player?')) {
        try {
          await deletePlayerStat(adminState.sessionId, statId);
          await loadGameStats(gameId);
        } catch (error) {
          alert(error.message);
        }
      }
    });
  });

  // Save and finish game
  document.getElementById('save-game-stats-btn')?.addEventListener('click', async () => {
    const ourScore = parseInt(document.getElementById('our-score-input').value) || 0;
    const opponentScore = parseInt(document.getElementById('opponent-score-input').value) || 0;

    const outcome = ourScore > opponentScore ? 'win' : ourScore < opponentScore ? 'loss' : 'draw';

    try {
      await updateGameScore(adminState.sessionId, gameId, {
        our_score: ourScore,
        opponent_score: opponentScore,
        status: 'result',
        outcome
      });
      alert('Game stats saved successfully!');
      window.location.hash = '#/admin/schedules';
    } catch (error) {
      alert(error.message);
    }
  });

  // Auto-save score changes
  const scoreInputs = [
    document.getElementById('our-score-input'),
    document.getElementById('opponent-score-input')
  ];

  scoreInputs.forEach(input => {
    input?.addEventListener('change', async () => {
      const ourScore = parseInt(document.getElementById('our-score-input').value) || 0;
      const opponentScore = parseInt(document.getElementById('opponent-score-input').value) || 0;

      try {
        await updateGameScore(adminState.sessionId, gameId, {
          our_score: ourScore,
          opponent_score: opponentScore
        });
      } catch (error) {
        console.error('Failed to auto-save scores:', error);
      }
    });
  });
}

async function loadRosters() {
  try {
    const response = await fetchAllPlayers(adminState.sessionId);
    adminState.allPlayers = response.players || [];
    
    // Apply current filter
    let displayedPlayers = adminState.allPlayers;
    if (adminState.selectedTeamFilter !== 'all') {
      displayedPlayers = adminState.allPlayers.filter(p => p.team === adminState.selectedTeamFilter);
    }

    const container = document.getElementById('main-content');
    const isSuperAdmin = adminState.adminRole === 'super-admin';
    container.innerHTML = renderRosterList(displayedPlayers, adminState.selectedTeamFilter, isSuperAdmin);

    if (window.lucide) window.lucide.createIcons();

    // Event Listeners
    document.getElementById('add-player-btn')?.addEventListener('click', () => {
      window.location.hash = '#/admin/rosters/new';
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        adminState.selectedTeamFilter = e.target.dataset.filter;
        loadRosters();
      });
    });

    document.querySelectorAll('.edit-player-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        window.location.hash = `#/admin/rosters/${id}`;
      });
    });

    document.querySelectorAll('.delete-player-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('Are you sure you want to delete this player?')) {
          try {
            await deletePlayer(adminState.sessionId, id);
            await loadRosters();
          } catch (error) {
            alert(error.message);
          }
        }
      });
    });

  } catch (error) {
    document.getElementById('main-content').innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
  }
}

async function loadPlayerForm(playerId) {
  let player = null;
  if (playerId && playerId !== 'new') {
    player = adminState.allPlayers.find(p => p.id === playerId);
    if (!player) {
      try {
        const response = await fetchAllPlayers(adminState.sessionId);
        adminState.allPlayers = response.players || [];
        player = adminState.allPlayers.find(p => p.id === playerId);
      } catch (error) {
        console.error('Error fetching player:', error);
      }
    }
  }

  const container = document.getElementById('main-content');
  container.innerHTML = renderPlayerForm(player);

  if (window.lucide) window.lucide.createIcons();

  // Setup photo upload
  const photoFileInput = document.getElementById('player-photo-file');
  const uploadPhotoBtn = document.getElementById('upload-player-photo-btn');
  uploadPhotoBtn?.addEventListener('click', () => photoFileInput.click());

  photoFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        const response = await uploadImage(adminState.sessionId, file.name, base64Data);
        document.getElementById('player-image-url').value = response.url;
        alert('Photo uploaded successfully!');
      } catch (error) {
        alert('Upload failed: ' + error.message);
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('close-player-modal')?.addEventListener('click', () => {
    window.location.hash = '#/admin/rosters';
  });

  document.getElementById('cancel-player-btn')?.addEventListener('click', () => {
    window.location.hash = '#/admin/rosters';
  });

  document.getElementById('player-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const playerData = {
      name: document.getElementById('player-name').value.trim(),
      number: document.getElementById('player-number').value.trim(),
      team: document.getElementById('player-team').value,
      position: document.getElementById('player-position').value,
      nationality: document.getElementById('player-nationality').value.trim(),
      height: document.getElementById('player-height').value.trim(),
      age: parseInt(document.getElementById('player-age').value) || null,
      points_per_game: parseFloat(document.getElementById('player-ppg').value) || 0,
      image_url: document.getElementById('player-image-url').value.trim(),
      bio: document.getElementById('player-bio').value.trim(),
      career_highlights: document.getElementById('player-highlights').value.trim()
    };

    try {
      if (playerId && playerId !== 'new') {
        await updatePlayer(adminState.sessionId, playerId, playerData);
      } else {
        await createPlayer(adminState.sessionId, playerData);
      }
      window.location.hash = '#/admin/rosters';
    } catch (error) {
      alert(error.message);
    }
  });
}

async function loadNews(activeSubView = 'articles', editingArticle = null) {
  try {
    const isSuperAdmin = adminState.adminRole === 'super-admin';
    const [newsResponse, pollsResponse] = await Promise.all([
      fetchNews(),
      fetchPolls()
    ]);
    
    const articles = newsResponse.news || [];
    const polls = pollsResponse.polls || [];

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = renderNewsManager(articles, polls, activeSubView, editingArticle, isSuperAdmin);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Tab switching
      document.getElementById('tab-manage-articles')?.addEventListener('click', () => {
        loadNews('articles');
      });
      document.getElementById('tab-manage-polls')?.addEventListener('click', () => {
        loadNews('polls');
      });

      if (activeSubView === 'articles') {
        // Article form submission
        document.getElementById('news-article-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = document.getElementById('article-title').value.trim();
          const category = document.getElementById('article-category').value;
          const imageUrl = document.getElementById('article-image').value.trim();
          const content = document.getElementById('article-content').value.trim();

          const articleData = { title, category, image_url: imageUrl, content };

          try {
            if (editingArticle) {
              await updateNews(adminState.sessionId, editingArticle.id, articleData);
              alert('Article updated successfully!');
            } else {
              await createNews(adminState.sessionId, articleData);
              alert('Article published successfully!');
            }
            loadNews('articles');
          } catch (error) {
            alert(error.message);
          }
        });

        // Edit article
        document.querySelectorAll('.edit-article-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const article = articles.find(a => a.id === parseInt(id));
            if (article) {
              loadNews('articles', article);
            }
          });
        });

        // Cancel edit
        document.getElementById('cancel-article-edit')?.addEventListener('click', () => {
          loadNews('articles');
        });

        // Delete article
        document.querySelectorAll('.delete-article-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this article?')) {
              try {
                await deleteNews(adminState.sessionId, id);
                alert('Article deleted successfully!');
                loadNews('articles');
              } catch (error) {
                alert(error.message);
              }
            }
          });
        });

        // Image upload for article
        const fileInput = document.getElementById('article-image-file');
        const uploadBtn = document.getElementById('upload-article-image-btn');
        uploadBtn?.addEventListener('click', () => fileInput.click());

        fileInput?.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64Data = reader.result.split(',')[1];
              const response = await uploadImage(adminState.sessionId, file.name, base64Data);
              document.getElementById('article-image').value = response.url;
              alert('Image uploaded successfully!');
            } catch (error) {
              alert('Upload failed: ' + error.message);
            }
          };
          reader.readAsDataURL(file);
        });

      } else {
        // Poll form submission
        document.getElementById('news-poll-form')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const question = document.getElementById('poll-question').value.trim();
          const optionInputs = document.querySelectorAll('.poll-opt-input');
          const options = Array.from(optionInputs)
            .map(input => input.value.trim())
            .filter(val => val !== '');

          if (options.length < 2) {
            alert('Please provide at least 2 options.');
            return;
          }

          try {
            await createPoll(adminState.sessionId, { question, options });
            alert('Poll published successfully!');
            loadNews('polls');
          } catch (error) {
            alert(error.message);
          }
        });

        // Add poll option input field dynamically
        document.getElementById('add-poll-option-btn')?.addEventListener('click', () => {
          const container = document.getElementById('poll-options-inputs');
          const inputCount = container.querySelectorAll('input').length + 1;
          const input = document.createElement('input');
          input.className = 'login-input poll-opt-input';
          input.type = 'text';
          input.placeholder = `Option ${inputCount}`;
          input.style.width = '100%';
          container.appendChild(input);
        });

        // Toggle poll status (open/close)
        document.querySelectorAll('.toggle-poll-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            const currentStatus = e.target.dataset.status;
            const newStatus = currentStatus === 'active' ? 'closed' : 'active';
            try {
              await updatePollStatus(adminState.sessionId, id, newStatus);
              alert(`Poll status updated to ${newStatus}`);
              loadNews('polls');
            } catch (error) {
              alert(error.message);
            }
          });
        });

        // Delete poll
        document.querySelectorAll('.delete-poll-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this poll?')) {
              try {
                await deletePoll(adminState.sessionId, id);
                alert('Poll deleted successfully!');
                loadNews('polls');
              } catch (error) {
                alert(error.message);
              }
            }
          });
        });
      }
    }
  } catch (error) {
    console.error('Failed to load news:', error);
    alert('Failed to load news/polls management.');
  }
}

async function loadStandings(editingStanding = null) {
  try {
    const isSuperAdmin = adminState.adminRole === 'super-admin';
    const response = await fetchStandings();
    const allStandings = response.standings || [];
    const selectedCategory = adminState.selectedStandingCategory;
    const selectedSeason = adminState.selectedStandingSeason;
    const standings = allStandings.filter(s =>
      String(s.team_category || '').toLowerCase() === selectedCategory &&
      String(s.season || '2025/2026') === selectedSeason
    );
    const scopedEditingStanding = editingStanding &&
      String(editingStanding.team_category || '').toLowerCase() === selectedCategory &&
      String(editingStanding.season || '2025/2026') === selectedSeason
        ? editingStanding
        : null;

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = renderStandingsManager(standings, scopedEditingStanding, isSuperAdmin, selectedCategory, selectedSeason);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      const CENTRAL_ZONE_LEAGUE = 'CENTRAL ZONE BASKETBALL LEAGUE';
      const competitionTypeSelect = document.getElementById('standing-competition-type');
      const tournamentWrap = document.getElementById('standing-tournament-wrap');
      const leagueNameWrap = document.getElementById('standing-league-name-wrap');
      const tournamentInput = document.getElementById('standing-tournament');

      const updateCompetitionFields = () => {
        const isLeague = competitionTypeSelect?.value === 'league';
        if (leagueNameWrap) leagueNameWrap.style.display = isLeague ? 'block' : 'none';
        if (tournamentWrap) tournamentWrap.style.display = isLeague ? 'none' : 'block';
        if (tournamentInput) tournamentInput.required = !isLeague;
      };
      competitionTypeSelect?.addEventListener('change', updateCompetitionFields);
      updateCompetitionFields();

      const recalculateStandingTotals = () => {
        const won = parseInt(document.getElementById('standing-won')?.value) || 0;
        const lost = parseInt(document.getElementById('standing-lost')?.value) || 0;
        const forfeit = parseInt(document.getElementById('standing-forfeit')?.value) || 0;
        const pointsInput = document.getElementById('standing-points');
        const playedInput = document.getElementById('standing-played');
        const pfInput = document.getElementById('standing-points-for');
        const paInput = document.getElementById('standing-points-against');
        const diffInput = document.getElementById('standing-diff');
        if (pointsInput) pointsInput.value = (won * 2) + lost;
        if (playedInput) playedInput.value = won + lost + forfeit;
        if (diffInput) diffInput.value = (parseInt(pfInput?.value) || 0) - (parseInt(paInput?.value) || 0);
      };
      ['standing-won', 'standing-lost', 'standing-forfeit', 'standing-points-for', 'standing-points-against'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', recalculateStandingTotals);
      });
      recalculateStandingTotals();

      document.getElementById('admin-standing-season-filter')?.addEventListener('change', (e) => {
        adminState.selectedStandingSeason = e.currentTarget.value;
        localStorage.setItem('admin_standing_season', adminState.selectedStandingSeason);
        loadStandings(null);
      });

      const clearStandingsBtn = document.getElementById('clear-standings-table-btn');
      clearStandingsBtn?.addEventListener('click', async () => {
        if (adminState.adminRole !== 'super-admin') {
          await adminNotify('Only Super Admins can clear standings tables.', 'Permission denied', 'warning');
          return;
        }
        const confirmed = await adminAsk(`Clear all ${selectedCategory.toUpperCase()} standings records for ${selectedSeason}? This cannot be undone.`, 'Clear standings table');
        if (!confirmed) return;
        try {
          const response = await clearStandingsTable(adminState.sessionId, { season: selectedSeason, teamCategory: selectedCategory });
          await adminNotify(`Cleared ${response.deletedRows || 0} standings records.`, 'Standings cleared', 'success');
          await loadStandings(null);
        } catch (error) {
          await adminNotify(error.message, 'Unable to clear standings', 'error');
        }
      });

      const standingsImportBtn = document.getElementById('standings-import-btn');
      const standingsImportFile = document.getElementById('standings-import-file');
      standingsImportBtn?.addEventListener('click', () => standingsImportFile?.click());
      standingsImportFile?.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const response = await importStandingsFile(adminState.sessionId, file);
          const summary = response.summary || {};
          await adminNotify(`Imported ${summary.importedRows || 0} standings rows. Created: ${summary.createdRows || 0}. Updated: ${summary.updatedRows || 0}.`, 'Import complete', 'success');
          await loadStandings(null);
        } catch (error) {
          await adminNotify(error.message, 'Standings import failed', 'error');
        } finally {
          event.target.value = '';
        }
      });

      // Form submission
      document.getElementById('standing-entry-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const competitionType = document.getElementById('standing-competition-type')?.value || 'league';
        const tournament = competitionType === 'league'
          ? CENTRAL_ZONE_LEAGUE
          : document.getElementById('standing-tournament').value.trim();
        const season = document.getElementById('admin-standing-season-filter')?.value || adminState.selectedStandingSeason;
        const teamName = document.getElementById('standing-team').value.trim();
        const played = parseInt(document.getElementById('standing-played').value);
        const won = parseInt(document.getElementById('standing-won').value);
        const lost = parseInt(document.getElementById('standing-lost').value);
        if (played < won + lost) {
          await adminNotify('GP cannot be less than W + L. Please correct the standings record.', 'Invalid standings', 'warning');
          return;
        }

        const forfeit = parseInt(document.getElementById('standing-forfeit').value);
        const points = (won * 2) + lost;
        const pointsFor = parseInt(document.getElementById('standing-points-for')?.value) || 0;
        const pointsAgainst = parseInt(document.getElementById('standing-points-against')?.value) || 0;
        const pointDifference = pointsFor - pointsAgainst;
        const groupName = '';
        const teamCategory = document.getElementById('standing-category')?.value || '';

        const standingData = {
          tournament,
          season,
          team_name: teamName,
          team_category: teamCategory || null,
          played: won + lost + forfeit,
          won,
          lost,
          forfeit,
          points_for: pointsFor,
          points_against: pointsAgainst,
          point_difference: pointDifference,
          points,
          group_name: groupName
        };

        try {
          if (scopedEditingStanding) {
            // Ensure update payload uses the season currently selected in the UI
            standingData.season = document.getElementById('admin-standing-season-filter')?.value || standingData.season;
            await updateStandingsEntry(adminState.sessionId, scopedEditingStanding.id, standingData);
            await adminNotify('Standings record updated!', 'Success', 'success');
          } else {
            await createStandingsEntry(adminState.sessionId, standingData);
            await adminNotify(`New standings record added for ${season}!`, 'Success', 'success');
          }
          loadStandings(null);
        } catch (error) {
          await adminNotify(error.message, 'Unable to save standings', 'error');
        }
      });

      document.querySelectorAll('.admin-standing-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          adminState.selectedStandingCategory = e.currentTarget.dataset.category;
          localStorage.setItem('admin_standing_category', adminState.selectedStandingCategory);
          loadStandings(null);
        });
      });

      // Edit standing
      document.querySelectorAll('.edit-standing-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const record = standings.find(s => s.id === parseInt(id));
          if (record) {
            loadStandings(record);
          }
        });
      });

      // Cancel edit
      document.getElementById('cancel-standing-edit')?.addEventListener('click', () => {
        loadStandings(null);
      });

      // Delete standing
      document.querySelectorAll('.delete-standing-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (await adminAsk('Are you sure you want to delete this standings record?', 'Delete standings record')) {
            try {
              await deleteStandingsEntry(adminState.sessionId, id);
              await adminNotify('Standings record deleted!', 'Deleted', 'success');
              loadStandings(null);
            } catch (error) {
              await adminNotify(error.message, 'Unable to delete standings', 'error');
            }
          }
        });
      });
    }
  } catch (error) {
    console.error('Failed to load standings:', error);
    await adminNotify('Failed to load standings manager.', 'Load failed', 'error');
  }
}

async function loadGallery() {
  try {
    const isSuperAdmin = adminState.adminRole === 'super-admin';
    const response = await fetchGallery();
    const items = response.gallery || [];

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = renderGalleryManager(items, isSuperAdmin);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Form submission
      document.getElementById('gallery-item-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('gallery-title').value.trim();
        const mediaType = document.getElementById('gallery-type').value;
        const rawMediaUrl = document.getElementById('gallery-url').value.trim();
        const mediaUrl = mediaType === 'video' ? getYouTubeEmbedUrl(rawMediaUrl) : rawMediaUrl;

        try {
          await createGalleryItem(adminState.sessionId, { title, media_type: mediaType, media_url: mediaUrl });
          alert('Media item added to gallery!');
          loadGallery();
        } catch (error) {
          alert(error.message);
        }
      });

      // Delete gallery item
      document.querySelectorAll('.delete-gallery-item-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Are you sure you want to delete this gallery item?')) {
            try {
              await deleteGalleryItem(adminState.sessionId, id);
              alert('Media item deleted!');
              loadGallery();
            } catch (error) {
              alert(error.message);
            }
          }
        });
      });

      // Image upload for gallery
      const fileInput = document.getElementById('gallery-image-file');
      const uploadBtn = document.getElementById('upload-gallery-image-btn');
      
      // Hide upload button if type is video
      const typeSelect = document.getElementById('gallery-type');
      typeSelect?.addEventListener('change', () => {
        if (typeSelect.value === 'video') {
          uploadBtn.style.display = 'none';
        } else {
          uploadBtn.style.display = 'block';
        }
      });

      uploadBtn?.addEventListener('click', () => fileInput.click());

      fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = reader.result.split(',')[1];
            const response = await uploadImage(adminState.sessionId, file.name, base64Data);
            document.getElementById('gallery-url').value = response.url;
            alert('Image uploaded successfully!');
          } catch (error) {
            alert('Upload failed: ' + error.message);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  } catch (error) {
    console.error('Failed to load gallery:', error);
    alert('Failed to load gallery manager.');
  }
}

async function loadNotifications() {
  try {
    const isSuperAdmin = adminState.adminRole === 'super-admin';
    const [notifResponse, usersResponse] = await Promise.all([
      fetchNotifications(),
      fetchAllUsers(adminState.sessionId)
    ]);

    const notifications = notifResponse.notifications || [];
    const users = usersResponse.users || [];

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.innerHTML = renderNotificationManager(notifications, users, isSuperAdmin);
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Form submission
      document.getElementById('announcement-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('announcement-title').value.trim();
        const targetUser = document.getElementById('announcement-user').value;
        const message = document.getElementById('announcement-message').value.trim();

        const notifData = {
          title,
          message,
          user_id: targetUser === 'global' ? null : targetUser
        };

        try {
          await createNotification(adminState.sessionId, notifData);
          alert('Announcement broadcast successfully!');
          loadNotifications();
        } catch (error) {
          alert(error.message);
        }
      });
    }
  } catch (error) {
    console.error('Failed to load notifications:', error);
    alert('Failed to load notifications manager.');
  }
}

function setupLoginListeners() {
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('#admin-login-form');
    if (form) {
      e.preventDefault();
      const mode = form.querySelector('[name="admin_auth_mode"]')?.value || 'login';
      const email = form.querySelector('[name="email"]')?.value.trim();
      const password = form.querySelector('[name="password"]')?.value;
      const newPassword = form.querySelector('[name="newPassword"]')?.value;
      const resetToken = form.querySelector('[name="reset_token"]')?.value.trim();

      if (mode === 'forgot') {
        if (!email) {
          alert('Please enter your email address.');
          return;
        }
        try {
          await adminForgotPassword(email);
          alert('If an admin account with that email exists, a password reset link has been generated. Please check your inbox.');
          adminState.authMode = 'login';
          window.location.hash = '#/admin-login';
          initAdminApp();
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      if (mode === 'reset') {
        if (!resetToken) {
          alert('Missing reset token.');
          return;
        }
        if (!newPassword || newPassword.length < 6) {
          alert('Password must be at least 6 characters.');
          return;
        }
        try {
          await adminResetPassword(resetToken, newPassword);
          alert('Password reset successful! You can now log in with your new password.');
          adminState.authMode = 'login';
          window.location.hash = '#/admin-login';
          initAdminApp();
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      if (!email || !password) {
        alert('Please enter both email and password.');
        return;
      }

      try {
        const response = await adminLogin(email, password);
        adminState.sessionId = response.sessionId;
        adminState.adminEmail = response.admin.email;
        adminState.adminRole = response.admin.role;

        localStorage.setItem('admin_session_id', response.sessionId);
        localStorage.setItem('admin_email', response.admin.email);
        localStorage.setItem('admin_role', response.admin.role);

        window.location.hash = '#/admin/dashboard';
        initAdminApp();
      } catch (error) {
        alert(error.message);
      }
    }
  });
}

async function handleLogout() {
  try {
    await adminLogout(adminState.sessionId);
  } catch (error) {
    console.error('Logout error:', error);
  }

  adminState.sessionId = null;
  adminState.adminEmail = null;
  adminState.adminRole = null;

  localStorage.removeItem('admin_session_id');
  localStorage.removeItem('admin_email');
  localStorage.removeItem('admin_role');

  window.location.hash = '#/admin-login';
  initAdminApp();
}

// Initialize on DOM ready or immediately if already loaded
window.addEventListener('hashchange', initAdminApp);

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initAdminApp);
} else {
  initAdminApp();
}




