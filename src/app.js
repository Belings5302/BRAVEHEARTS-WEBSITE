// Bravehearts Basketball Club - Main Application Entrypoint

import { products as localProducts } from './data.js';
import { renderHero, initHeroPlayerRotation } from './components/hero.js';
import { renderRoster, renderTeamPage, renderPlayerPage } from './components/roster.js';
import { renderFixtures, renderStandingsForTournament } from './components/fixtures.js';
import { renderTrophy } from './components/trophy.js';
import { renderImpact } from './components/impact.js';
import { renderLogin } from './components/login.js';
import { renderFanZone, renderCartDrawer, isSubscriptionProduct } from './components/fanzone.js';
import { renderGameStats } from './components/game-stats.js';
import { renderNewsFeed, renderArticleDetailsModal } from './components/news.js';
import { renderGallery } from './components/gallery.js';
import { getYouTubeEmbedUrl } from './youtube.js';
import {
  registerUser,
  loginUser,
  createOrder,
  confirmPayment,
  fetchProducts,
  fetchGames,
  fetchPlayers,
  fetchNews,
  fetchNewsDetail,
  fetchGallery,
  fetchStandings,
  fetchPolls,
  voteOnPoll,
  fetchNotifications,
  fetchUserOrders,
  forgotPassword,
  resetPassword,
  getExchangeRate
} from './api.js';

let gameStatsInterval = null;
let realtimeSocket = null;
let realtimeReconnectTimer = null;

// Client-side trackers for the last known updates
const clientLastUpdates = {
  products: 0,
  games: 0,
  players: 0,
  stats: 0,
  news: 0,
  gallery: 0,
  polls: 0,
  standings: 0,
  notifications: 0
};

function getRealtimeUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

function connectRealtimeUpdates() {
  if (!('WebSocket' in window) || realtimeSocket) return;

  try {
    realtimeSocket = new WebSocket(getRealtimeUrl());

    realtimeSocket.addEventListener('message', async event => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'connected' && message.lastUpdates) {
          Object.assign(clientLastUpdates, message.lastUpdates);
          return;
        }
        if (message.type === 'update' && message.lastUpdates) {
          await processServerUpdates(message.lastUpdates);
        }
      } catch (error) {
        console.warn('Failed to process realtime update:', error);
      }
    });

    realtimeSocket.addEventListener('close', () => {
      realtimeSocket = null;
      clearTimeout(realtimeReconnectTimer);
      realtimeReconnectTimer = setTimeout(connectRealtimeUpdates, 5000);
    });

    realtimeSocket.addEventListener('error', () => {
      realtimeSocket?.close();
    });
  } catch (error) {
    console.warn('Failed to connect realtime updates:', error);
  }
}

async function processServerUpdates(serverUpdates) {
  let productsUpdated = false;
  let gamesUpdated = false;
  let playersUpdated = false;
  let statsUpdated = false;
  let newsUpdated = false;
  let galleryUpdated = false;
  let pollsUpdated = false;
  let standingsUpdated = false;
  let notificationsUpdated = false;

  if (serverUpdates.products > clientLastUpdates.products) {
    clientLastUpdates.products = serverUpdates.products;
    productsUpdated = true;
  }
  if (serverUpdates.games > clientLastUpdates.games) {
    clientLastUpdates.games = serverUpdates.games;
    gamesUpdated = true;
  }
  if (serverUpdates.players > clientLastUpdates.players) {
    clientLastUpdates.players = serverUpdates.players;
    playersUpdated = true;
  }
  if (serverUpdates.stats > clientLastUpdates.stats) {
    clientLastUpdates.stats = serverUpdates.stats;
    statsUpdated = true;
  }
  if (serverUpdates.news > clientLastUpdates.news) {
    clientLastUpdates.news = serverUpdates.news;
    newsUpdated = true;
  }
  if (serverUpdates.gallery > clientLastUpdates.gallery) {
    clientLastUpdates.gallery = serverUpdates.gallery;
    galleryUpdated = true;
  }
  if (serverUpdates.polls > clientLastUpdates.polls) {
    clientLastUpdates.polls = serverUpdates.polls;
    pollsUpdated = true;
  }
  if (serverUpdates.standings > clientLastUpdates.standings) {
    clientLastUpdates.standings = serverUpdates.standings;
    standingsUpdated = true;
  }
  if (serverUpdates.notifications > clientLastUpdates.notifications) {
    clientLastUpdates.notifications = serverUpdates.notifications;
    notificationsUpdated = true;
  }

  if (notificationsUpdated && state.user) {
    await loadNotifications();
  }

  if (productsUpdated || gamesUpdated || playersUpdated || statsUpdated || newsUpdated || galleryUpdated || pollsUpdated || standingsUpdated) {
    await handleUpdatesDetected({ productsUpdated, gamesUpdated, playersUpdated, statsUpdated, newsUpdated, galleryUpdated, pollsUpdated, standingsUpdated });
  }
}

// Check for backend updates via AJAX polling
async function checkForUpdates() {
  try {
    const res = await fetch('/api/updates');
    if (!res.ok) return;
    const serverUpdates = await res.json();
    await processServerUpdates(serverUpdates);
  } catch (err) {
    console.warn('Failed to poll updates:', err);
  }
}

// Handle detected updates by dynamically refreshing the current view without page reloading
async function handleUpdatesDetected({ productsUpdated, gamesUpdated, playersUpdated, statsUpdated, newsUpdated, galleryUpdated, pollsUpdated, standingsUpdated }) {
  const hash = window.location.hash || '#/home';

  if (productsUpdated) {
    await loadProducts();
    if (hash === '#/fanzone') {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        await loadExchangeRate();
        mainContent.innerHTML = renderFanZone(state.products, state.exchangeRate, state.productSearch, state.subscriptionPaid);
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  if (gamesUpdated && hash === '#/home') {
    await loadHomePage();
  }

  if ((gamesUpdated || standingsUpdated) && ['#/fixtures', '#/schedule', '#/results', '#/standings'].includes(hash)) {
    await loadFixturesPage(true);
  }

  if (newsUpdated || pollsUpdated) {
    if (hash === '#/news') {
      await loadNewsPage();
    }
  }

  if (galleryUpdated && hash === '#/gallery') {
    await loadGalleryPage();
  }

  if (playersUpdated) {
    if (hash === '#/roster') {
      await loadRosterPage(true);
    } else {
      const rosterTeamMatch = hash.match(/^#\/roster\/([^\/]+)$/);
      const playerMatch = hash.match(/^#\/player\/([^\/]+)$/);
      if (rosterTeamMatch) {
        await loadDynamicTeamPage(rosterTeamMatch[1], true);
      } else if (playerMatch) {
        await loadDynamicPlayerPage(playerMatch[1], true);
      }
    }
  }

  if (statsUpdated || gamesUpdated) {
    const gameStatsMatch = hash.match(/^#\/game\/([^\/]+)$/);
    if (gameStatsMatch) {
      await loadGameStatsPage(gameStatsMatch[1], true);
    }
  }
}

function showAppDialog({ title = 'Notice', message = '', type = 'info', confirmText = 'OK', cancelText = null, input = null } = {}) {
  return new Promise(resolve => {
    const existing = document.getElementById('app-dialog-overlay');
    if (existing) existing.remove();

    const iconMap = { success: 'check-circle', error: 'alert-circle', warning: 'alert-triangle', info: 'info' };
    const overlay = document.createElement('div');
    overlay.id = 'app-dialog-overlay';
    overlay.className = 'app-dialog-overlay';
    overlay.innerHTML = `
      <div class="app-dialog-card app-dialog-${type}" role="dialog" aria-modal="true" aria-labelledby="app-dialog-title">
        <div class="app-dialog-icon"><i data-lucide="${iconMap[type] || iconMap.info}"></i></div>
        <h3 id="app-dialog-title">${title}</h3>
        <p>${String(message).replace(/\n/g, '<br>')}</p>
        ${input ? `<input class="app-dialog-field" type="${input.type || 'text'}" placeholder="${input.placeholder || ''}" value="${input.value || ''}" />` : ''}
        <div class="app-dialog-actions">
          ${cancelText ? `<button type="button" class="btn btn-secondary app-dialog-cancel">${cancelText}</button>` : ''}
          <button type="button" class="btn btn-primary app-dialog-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    const close = (value) => {
      const field = overlay.querySelector('.app-dialog-field');
      const result = input && value ? field?.value?.trim() : value;
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
      resolve(result);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Enter') close(true);
    };
    overlay.querySelector('.app-dialog-confirm')?.addEventListener('click', () => close(true));
    overlay.querySelector('.app-dialog-cancel')?.addEventListener('click', () => close(false));
    overlay.addEventListener('click', event => {
      if (event.target === overlay && cancelText) close(false);
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
    (overlay.querySelector('.app-dialog-field') || overlay.querySelector('.app-dialog-confirm'))?.focus();
  });
}

const notify = (message, title = 'Notice', type = 'info') => showAppDialog({ title, message, type });
const ask = (message, title = 'Please confirm') => showAppDialog({ title, message, type: 'warning', confirmText: 'Continue', cancelText: 'Cancel' });
const promptDialog = (message, title = 'Enter details', input = {}) => showAppDialog({ title, message, type: 'info', confirmText: 'Continue', cancelText: 'Cancel', input });

function restoreInputFocus(inputId, value) {
  requestAnimationFrame(() => {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.focus({ preventScroll: true });
    input.value = value;
    const cursor = value.length;
    try {
      input.setSelectionRange(cursor, cursor);
    } catch (_) {
      // Some input types may not support selection ranges.
    }
  });
}

function safeLocalStorageGet(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.warn(`Unable to read localStorage key "${key}":`, error);
    return fallback;
  }
}

function safeParseStoredJson(key, fallback) {
  const raw = safeLocalStorageGet(key, null);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Ignoring invalid localStorage JSON for "${key}":`, error);
    try {
      localStorage.removeItem(key);
    } catch (_) {
      // Ignore cleanup errors; fallback keeps the app usable.
    }
    return fallback;
  }
}

// Application State
const state = {
  cart: [],
  cartOpen: false,
  mobileMenuOpen: false,
  theme: safeLocalStorageGet('theme', 'dark'),
  user: safeLocalStorageGet('bh_user', null),
  userId: safeLocalStorageGet('bh_user_id', null),
  authMode: 'login',
  subscriptionPaid: safeLocalStorageGet('bh_subscription_paid', 'false') === 'true',
  mobileMoneyMethod: null,
  activeOrderId: null,
  activeOrderReference: null,
  products: localProducts,
  news: [],
  polls: [],
  gallery: [],
  standings: [],
  notifications: [],
  activeVotes: safeParseStoredJson('bh_votes', {}),
  activeScheduleTab: 'schedule',
  activeGalleryFilter: 'all',
  notificationsOpen: false,
  exchangeRate: 0.0006,
  productSearch: '',
  newsSearch: '',
  gamesSearch: '',
  resultFilters: safeParseStoredJson('bh_result_filters', { team: 'all', competition: 'all' }),
  scheduleStatusFilter: 'all'
};

// Apply theme class to body immediately (prevents flashing)
if (state.theme === 'light') {
  document.body.classList.add('light-theme');
} else {
  document.body.classList.remove('light-theme');
}

async function refreshSubscriptionStatus() {
  if (!state.userId) {
    state.subscriptionPaid = false;
    localStorage.setItem('bh_subscription_paid', 'false');
    return;
  }

  try {
    const response = await fetchSubscription(state.userId);
    state.subscriptionPaid = response.subscriptionStatus === 'active';
    localStorage.setItem('bh_subscription_paid', String(state.subscriptionPaid));
  } catch (error) {
    console.warn('Could not refresh subscription status:', error);
  }
}

async function loadExchangeRate() {
  try {
    state.exchangeRate = await getExchangeRate();
  } catch (error) {
    console.warn('Could not load current MWK/USD exchange rate, using fallback.', error);
  }
}

async function loadProducts(search = state.productSearch) {
  try {
    const response = await fetchProducts(search);
    if (response?.products?.length) {
      state.products = response.products.map(product => ({
        ...product,
        price: product.price ?? product.price_mwk,
        priceUSD: product.priceUSD ?? product.price_usd,
        isNew: product.isNew ?? Boolean(product.is_new)
      }));
    }
  } catch (error) {
    console.warn('Could not load products from backend, using local fallback.', error);
    state.products = localProducts;
  }
}

function renderStartupError(error) {
  console.error('Failed to start Bravehearts website:', error);
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = `
    <main class="page-container" style="min-height: 100vh; display: grid; place-items: center; padding: 24px;">
      <section class="glass" style="max-width: 620px; padding: 28px; border-radius: 20px; text-align: center;">
        <h1 style="margin-bottom: 12px; color: var(--color-accent);">Website failed to load</h1>
        <p style="color: var(--color-text-muted); margin-bottom: 18px;">
          Something went wrong while starting the Bravehearts website. Please refresh the page.
        </p>
        <button class="btn btn-primary" type="button" onclick="window.location.reload()">Refresh page</button>
      </section>
    </main>
  `;
}

// Mount Application Structure
async function initApp() {
  try {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Root element #app was not found.');
  }
  
  root.innerHTML = `
    <!-- Header / Navigation -->
    <header class="site-header" id="site-header">
      <div class="nav-container">
        <a href="#/home" class="logo-wrapper">
          <div class="logo-icon"><img id="site-logo-img" src="./src/assets/logo.png" alt="Bravehearts Logo"></div>
          <div class="logo-text">Brave<span>hearts</span></div>
        </a>
        
        <ul class="nav-links" id="nav-links">
          <li><a class="nav-link" href="#/home">Home</a></li>
          <li><a class="nav-link" href="#/news">News</a></li>
          <li><a class="nav-link" href="#/roster">Roster</a></li>
          <li><a class="nav-link" href="#/schedule">Schedule</a></li>
          <li><a class="nav-link" href="#/results">Results</a></li>
          <li><a class="nav-link" href="#/standings">Standings</a></li>

          <li><a class="nav-link" href="#/trophy">Trophies</a></li>
          <li><a class="nav-link" href="#/impact">Impact</a></li>
          <li><a class="nav-link" href="#/fanzone">Fanzone</a></li>
          <li><a class="nav-link" href="#/login">MyAccount</a></li>
        </ul>
        
        <div class="nav-actions">
          <!-- Notification Bell -->
          <button class="theme-toggle-btn" id="notification-bell-btn" title="Notifications" ${!state.user ? 'style="display: none;"' : ''} style="position: relative; margin-right: 8px;">
            <i data-lucide="bell"></i>
            <span class="notification-badge" id="global-notification-count" style="display: none; position: absolute; top: -4px; right: -4px; background: var(--color-accent); color: white; border-radius: 50%; font-size: 0.7rem; font-weight: 700; width: 16px; height: 16px; align-items: center; justify-content: center;">0</span>
          </button>

          <!-- Theme Toggle -->
          <button class="theme-toggle-btn" id="theme-toggle-btn" title="Toggle Light/Dark Theme">
            <i data-lucide="${state.theme === 'dark' ? 'sun' : 'moon'}"></i>
          </button>
        </div>
      </div>

    </header>

    <!-- Mobile Floating Navbar (Icons Only) -->
    <nav class="mobile-floating-nav" id="mobile-floating-nav">
      <div class="mobile-floating-scroll">
        <a class="mobile-floating-link" href="#/home" title="Home"><i data-lucide="home"></i></a>
        <a class="mobile-floating-link" href="#/news" title="News"><i data-lucide="newspaper"></i></a>
        <a class="mobile-floating-link" href="#/roster" title="Roster"><i data-lucide="users"></i></a>
        <a class="mobile-floating-link" href="#/schedule" title="Schedule"><i data-lucide="calendar"></i></a>
        <a class="mobile-floating-link" href="#/results" title="Results"><i data-lucide="check-square"></i></a>
        <a class="mobile-floating-link" href="#/standings" title="Standings"><i data-lucide="list-ordered"></i></a>
        <a class="mobile-floating-link" href="#/trophy" title="Trophies"><i data-lucide="award"></i></a>
        <a class="mobile-floating-link" href="#/impact" title="Impact"><i data-lucide="heart"></i></a>
        <a class="mobile-floating-link" href="#/fanzone" title="Fanzone"><i data-lucide="shopping-bag"></i></a>
        <a class="mobile-floating-link" href="#/login" title="MyAccount"><i data-lucide="user"></i></a>
      </div>
    </nav>
    <button class="cart-toggle-btn cart-fab" id="cart-toggle-btn" title="Open Shopping Cart" style="display: none;">
      <i data-lucide="shopping-cart"></i>
      <span class="cart-badge" id="global-cart-count">0</span>
    </button>

    <!-- Main Content Areas (Mounted dynamically by router) -->
    <main id="main-content" style="padding-top: var(--site-header-height); min-height: calc(100vh - var(--site-header-height) - 340px);"></main>

    <!-- Global Portals -->
    <div id="cart-portal"></div>
    <div id="notification-portal"></div>

    <!-- Footer -->
    <footer class="site-footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="#/home" class="logo-wrapper" style="margin-bottom: 16px;">
            <div class="logo-icon"><img src="./src/assets/logo.png" alt="Bravehearts Logo"></div>
            <div class="logo-text">Brave<span>hearts</span></div>
          </a>
          <p>Changing lives through basketball. Founded in Lilongwe, Malawi in 2015.</p>
        </div>
        <div>
          <h4 class="footer-title">Club Links</h4>
          <ul class="footer-links">
            <li><a class="footer-link" href="#/home">Home</a></li>
            <li><a class="footer-link" href="#/news">News</a></li>
            <li><a class="footer-link" href="#/roster">Roster</a></li>
            <li><a class="footer-link" href="#/schedule">Schedule</a></li>
            <li><a class="footer-link" href="#/results">Results</a></li>
            <li><a class="footer-link" href="#/standings">Standings</a></li>
          </ul>
        </div>
        <div>
          <h4 class="footer-title">Community</h4>
          <ul class="footer-links">
            <li><a class="footer-link" href="#/impact">Scholarship Program</a></li>
            <li><a class="footer-link" href="#/fanzone">Supporters Shop</a></li>
            <li><a class="footer-link" href="https://www.fiba.basketball" target="_blank">FIBA Basketball</a></li>
          </ul>
        </div>
        <div>
          <h4 class="footer-title">Headquarters</h4>
          <p style="font-size: 0.9rem; margin-bottom: 8px;">ABC Blue Gym</p>
          <p style="font-size: 0.9rem; margin-bottom: 8px;">Lilongwe, Malawi</p>
          <p style="font-size: 0.9rem; color: var(--color-accent);">info@bravehearts.mw</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 Bravehearts Basketball Club. All rights reserved.</p>
        <p style="color: var(--color-text-muted);">Designed for Malawian Basketball Excellence</p>
      </div>
    </footer>
  `;

  applyTheme();

  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/home';
  }

  // Fetch initial update timestamps to prevent immediate reload
  try {
    const res = await fetch('/api/updates');
    if (res.ok) {
      const initialUpdates = await res.json();
      Object.assign(clientLastUpdates, initialUpdates);
    }
  } catch (err) {
    console.error('Failed to get initial update timestamps:', err);
  }

  await loadProducts();
  if (state.user) {
    await loadNotifications();
  }
  renderActivePage();
  setupEventListeners();

  connectRealtimeUpdates();

  // Fallback polling if WebSocket is unavailable or disconnected
  setInterval(() => {
    if (!realtimeSocket || realtimeSocket.readyState !== WebSocket.OPEN) {
      checkForUpdates();
    }
  }, 10000);
  } catch (error) {
    renderStartupError(error);
  }
}

// Load and display homepage
async function loadHomePage() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  try {
    const [gamesResponse, newsResponse] = await Promise.all([
      fetchGames(),
      fetchNews()
    ]);
    const liveGame = (gamesResponse.games || []).find(g => g.status === 'live');
    const recentArticles = (newsResponse.news || []).slice(0, 3);
    mainContent.innerHTML = renderHero(liveGame, recentArticles, Boolean(state.user));
    if (window.lucide) window.lucide.createIcons();
    initHeroPlayerRotation();
    bindArticleModalListeners();
  } catch (e) {
    mainContent.innerHTML = renderHero(null, [], Boolean(state.user));
    if (window.lucide) window.lucide.createIcons();
    initHeroPlayerRotation();
    bindArticleModalListeners();
  }
}

// Load and display news page
async function loadNewsPage(isAutoUpdate = false, search = state.newsSearch) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  try {
    const [newsRes, pollsRes] = await Promise.all([fetchNews(search), fetchPolls()]);
    state.news = newsRes.news || [];
    state.polls = pollsRes.polls || [];
    
    mainContent.innerHTML = renderNewsFeed(state.news, state.polls, state.activeVotes, state.newsSearch);
    if (window.lucide) window.lucide.createIcons();
    bindNewsPageListeners();
  } catch (e) {
    console.error('Failed to load news/polls page:', e);
  }
}

function bindArticleModalListeners() {
  document.querySelectorAll('.read-article-btn').forEach(btn => {
    if (btn.dataset.articleBound === 'true') return;
    btn.dataset.articleBound = 'true';
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      try {
        const res = await fetchNewsDetail(id);
        const modal = document.getElementById('article-modal');
        const content = document.getElementById('article-modal-content');
        if (modal && content) {
          content.innerHTML = renderArticleDetailsModal(res.article);
          modal.style.display = 'flex';
          modal.scrollTop = 0;
          content.scrollTop = 0;
          document.body.classList.add('article-modal-open');
          if (window.lucide) window.lucide.createIcons();
        }
      } catch (err) {
        notify('Failed to load article details.', 'Unable to open article', 'error');
      }
    });
  });

  const closeBtn = document.getElementById('close-article-modal');
  if (closeBtn && closeBtn.dataset.articleCloseBound !== 'true') {
    closeBtn.dataset.articleCloseBound = 'true';
    closeBtn.addEventListener('click', () => {
      const modal = document.getElementById('article-modal');
      if (modal) modal.style.display = 'none';
      document.body.classList.remove('article-modal-open');
    });
  }
}

function bindNewsPageListeners() {
  bindArticleModalListeners();
  const newsSearchInput = document.getElementById('news-search-input');
  if (newsSearchInput) {
    newsSearchInput.addEventListener('input', debounce(async (e) => {
      const value = e.target.value;
      state.newsSearch = value.trim();
      await loadNewsPage(true, state.newsSearch);
      restoreInputFocus('news-search-input', value);
    }, 350));
  }

  // Submit poll vote
  document.querySelectorAll('.poll-vote-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const pollId = e.currentTarget.dataset.pollId;
      const optionIndex = parseInt(e.currentTarget.dataset.optionIndex);
      try {
        if (!state.userId) {
          notify('Please log in to vote in polls.', 'Login required', 'warning');
          window.location.hash = '#/login';
          return;
        }
        await voteOnPoll(pollId, optionIndex, state.userId);
        state.activeVotes[pollId] = optionIndex;
        localStorage.setItem('bh_votes', JSON.stringify(state.activeVotes));
        await loadNewsPage(); // Reload feed with results
      } catch (err) {
        notify(err.message, 'Vote failed', 'error');
      }
    });
  });
}

// Load and display gallery page
async function loadGalleryPage() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;
  try {
    const res = await fetchGallery();
    state.gallery = res.gallery || [];
    mainContent.innerHTML = renderGallery(state.gallery, state.activeGalleryFilter);
    if (window.lucide) window.lucide.createIcons();
    bindGalleryPageListeners();
  } catch (e) {
    console.error('Failed to load gallery:', e);
  }
}

function bindGalleryPageListeners() {
  // Gallery filtering
  document.querySelectorAll('[data-gallery-filter]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      state.activeGalleryFilter = e.currentTarget.dataset.galleryFilter;
      await loadGalleryPage();
    });
  });

  // Lightbox overlay
  document.querySelectorAll('.gallery-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      const url = card.dataset.url;
      const title = card.querySelector('.gallery-item-title').textContent;

      const lightbox = document.getElementById('gallery-lightbox');
      const container = document.getElementById('lightbox-media-container');
      const titleEl = document.getElementById('lightbox-title');

      if (lightbox && container && titleEl) {
        container.innerHTML = '';

        if (type === 'video') {
          const iframe = document.createElement('iframe');
          iframe.src = getYouTubeEmbedUrl(url);
          iframe.width = '640';
          iframe.height = '360';
          iframe.frameBorder = '0';
          iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
          iframe.allowFullscreen = true;
          iframe.style.maxWidth = '100%';
          iframe.style.borderRadius = '8px';
          container.appendChild(iframe);
        } else {
          const image = document.createElement('img');
          image.src = url;
          image.alt = title;
          image.style.maxWidth = '100%';
          image.style.maxHeight = '70vh';
          image.style.objectFit = 'contain';
          image.style.borderRadius = '8px';
          image.style.boxShadow = '0 0 30px rgba(0,0,0,0.8)';
          container.appendChild(image);
        }
        titleEl.textContent = title;
        lightbox.classList.add('active');
        document.body.classList.add('lightbox-active');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  });

  // Helper function to close lightbox
  const closeLightbox = () => {
    const lightbox = document.getElementById('gallery-lightbox');
    const container = document.getElementById('lightbox-media-container');
    if (lightbox) {
      lightbox.classList.remove('active');
      document.body.classList.remove('lightbox-active');
      if (container) container.innerHTML = ''; // Stop video
    }
  };

  // Close button
  const closeBtn = document.getElementById('close-lightbox-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });
  }

  // Close lightbox when clicking on the backdrop
  const lightbox = document.getElementById('gallery-lightbox');
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      // Only close if clicking on the backdrop itself, not the content
      if (e.target === lightbox) {
        closeLightbox();
      }
    });
  }

  // Close with ESC key
  const handleEscapeKey = (e) => {
    if (e.key === 'Escape') {
      const lightbox = document.getElementById('gallery-lightbox');
      if (lightbox && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    }
  };
  document.addEventListener('keydown', handleEscapeKey);
}

// Load and display dynamic fixtures page
async function loadFixturesPage(isAutoUpdate = false, search = state.gamesSearch, forcedTab = null) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  try {
    const [gamesRes, standingsRes] = await Promise.all([fetchGames(search), fetchStandings()]);
    const games = gamesRes.games || [];
    const standings = standingsRes.standings || [];
    state.standings = standings;

    if (!isAutoUpdate) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (state.mobileMenuOpen) toggleMobileMenu();
      mainContent.classList.remove('page-container');
      void mainContent.offsetWidth;
      mainContent.classList.add('page-container');
    }

    const visibleTab = forcedTab || state.activeScheduleTab;
    mainContent.innerHTML = renderFixtures(games, standings, visibleTab, state.gamesSearch, state.resultFilters, state.scheduleStatusFilter);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    const gamesSearchInput = document.getElementById('games-search-input');
    if (gamesSearchInput) {
      gamesSearchInput.addEventListener('input', debounce(async (e) => {
        const value = e.target.value;
        state.gamesSearch = value.trim();
        await loadFixturesPage(true, state.gamesSearch);
        restoreInputFocus('games-search-input', value);
      }, 350));
    }

    document.querySelectorAll('[data-schedule-status]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        state.scheduleStatusFilter = e.currentTarget.dataset.scheduleStatus || 'all';
        await loadFixturesPage(true);
      });
    });

    // Bind schedule sub-tab filters
    document.querySelectorAll('[data-schedule-tab]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        state.activeScheduleTab = e.currentTarget.dataset.scheduleTab;
        await loadFixturesPage(true);
      });
    });

    document.querySelectorAll('[data-results-team]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        state.resultFilters = { ...state.resultFilters, team: e.currentTarget.dataset.resultsTeam };
        localStorage.setItem('bh_result_filters', JSON.stringify(state.resultFilters));
        await loadFixturesPage(true);
      });
    });

    document.querySelectorAll('[data-results-competition]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        state.resultFilters = { ...state.resultFilters, competition: e.currentTarget.dataset.resultsCompetition };
        localStorage.setItem('bh_result_filters', JSON.stringify(state.resultFilters));
        await loadFixturesPage(true);
      });
    });

    // Bind team filter buttons for standings
    document.querySelectorAll('.team-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const teamKey = e.currentTarget.dataset.team;
        document.querySelectorAll('.team-filter-btn').forEach(x => x.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const resultsContainer = document.getElementById('standings-results');
        if (!resultsContainer) return;

        const leagueName = 'CENTRAL ZONE BASKETBALL LEAGUE';
        const filtered = (state.standings || []).filter(s => {
          const category = String(s.team_category || '').toLowerCase();
          const name = String(s.team_name || '').toLowerCase();
          const tournament = String(s.tournament || '').toLowerCase();
          return tournament === leagueName.toLowerCase() && (
            category === teamKey ||
            name.includes(teamKey) ||
            (name.includes('bravehearts') && name.includes(teamKey)) ||
            (teamKey === 'men' && name.includes('men')) ||
            (teamKey === 'ladies' && (name.includes('ladies') || name.includes('women')))
          );
        });

        if (!filtered.length) {
          resultsContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--color-text-muted);">No standings found for this team.</div>';
          return;
        }

        const allSeasons = Array.from({ length: 11 }, (_, index) => {
          const startYear = 2015 + index;
          return `${startYear}/${startYear + 1}`;
        }).reverse();
        const availableSeasons = new Set(filtered.map(s => s.season || '2025/2026'));
        const seasons = allSeasons.filter(season => availableSeasons.has(season));
        resultsContainer.innerHTML = `
          <div class="standings-season-selector" style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:16px; align-items:center;">
            <label for="standings-season-select" style="font-size:0.85rem; color:var(--color-text-muted); font-weight:700;">Season</label>
            <select id="standings-season-select" class="login-input" style="max-width:220px;">
              ${seasons.map(season => `<option value="${season}">${season}</option>`).join('')}
            </select>
          </div>
          <div id="standings-season-results"></div>
        `;

        const renderSeason = (season) => {
          const seasonRows = filtered.filter(s => (s.season || '2025/2026') === season);
          const container = document.getElementById('standings-season-results');
          if (container) container.innerHTML = renderStandingsForTournament(leagueName, seasonRows, teamKey, season);
        };

        const seasonSelect = document.getElementById('standings-season-select');
        seasonSelect?.addEventListener('change', (event) => {
          renderSeason(event.currentTarget.value);
        });

        renderSeason(seasons[0]);
        if (window.lucide) window.lucide.createIcons();
      });
    });
  } catch (error) {
    console.error('Failed to load fixtures:', error);
  }
}

// Load and display game stats page
async function loadGameStatsPage(gameId, isAutoUpdate = false) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  if (!isAutoUpdate && gameStatsInterval) {
    clearInterval(gameStatsInterval);
    gameStatsInterval = null;
  }

  const fetchAndUpdateStats = async (isFirstLoad = false) => {
    try {
      const [gameResponse, statsResponse] = await Promise.all([
        fetch(`/api/games/${encodeURIComponent(gameId)}`),
        fetch(`/api/games/${encodeURIComponent(gameId)}/stats`)
      ]);

      const gameData = await gameResponse.json();
      const statsData = await statsResponse.json();

      const game = gameData.game;
      const players = statsData.stats || [];

      if (window.location.hash !== `#/game/${gameId}`) {
        if (gameStatsInterval) {
          clearInterval(gameStatsInterval);
          gameStatsInterval = null;
        }
        return;
      }

      if (isFirstLoad) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (state.mobileMenuOpen) toggleMobileMenu();
        mainContent.classList.remove('page-container');
        void mainContent.offsetWidth;
        mainContent.classList.add('page-container');
      }

      const statsScrollContainer = mainContent.querySelector('.game-stats-table-scroll');
      const statsScrollLeft = statsScrollContainer ? statsScrollContainer.scrollLeft : 0;

      mainContent.innerHTML = renderGameStats(game, players);

      const nextStatsScrollContainer = mainContent.querySelector('.game-stats-table-scroll');
      if (nextStatsScrollContainer) {
        nextStatsScrollContainer.scrollLeft = statsScrollLeft;
      }

      updateActiveNavLink('#/schedule');

      if (window.lucide) {
        window.lucide.createIcons();
      }
      bindSmartBackButtons();

      if (game.status === 'live' && !gameStatsInterval) {
        gameStatsInterval = setInterval(() => fetchAndUpdateStats(false), 5000);
      } else if (game.status !== 'live' && gameStatsInterval) {
        clearInterval(gameStatsInterval);
        gameStatsInterval = null;
      }
    } catch (error) {
      console.error('Failed to load game stats:', error);
    }
  };

  await fetchAndUpdateStats(!isAutoUpdate);
}

async function loadRosterPage(isAutoUpdate = false) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  try {
    const response = await fetchPlayers();
    
    if (!isAutoUpdate) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (state.mobileMenuOpen) toggleMobileMenu();
      mainContent.classList.remove('page-container');
      void mainContent.offsetWidth;
      mainContent.classList.add('page-container');
    }

    mainContent.innerHTML = renderRoster(response.players || []);
    if (window.lucide) window.lucide.createIcons();
  } catch (error) {
    console.error('Failed to load roster:', error);
  }
}

async function loadDynamicTeamPage(teamId, isAutoUpdate = false) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  try {
    const response = await fetchPlayers(teamId);
    
    if (!isAutoUpdate) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (state.mobileMenuOpen) toggleMobileMenu();
      mainContent.classList.remove('page-container');
      void mainContent.offsetWidth;
      mainContent.classList.add('page-container');
    }

    mainContent.innerHTML = renderTeamPage(teamId, response.players || []);
    if (window.lucide) window.lucide.createIcons();
  } catch (error) {
    console.error('Failed to load team roster:', error);
  }
}

async function loadDynamicPlayerPage(playerId, isAutoUpdate = false) {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  try {
    const response = await fetchPlayers();
    
    if (!isAutoUpdate) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (state.mobileMenuOpen) toggleMobileMenu();
      mainContent.classList.remove('page-container');
      void mainContent.offsetWidth;
      mainContent.classList.add('page-container');
    }

    mainContent.innerHTML = renderPlayerPage(playerId, response.players || []);
    if (window.lucide) window.lucide.createIcons();
  } catch (error) {
    console.error('Failed to load player:', error);
  }
}

// Load Account View with Order History
async function loadLoginPage() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const resetMode = urlParams.get('resetMode') === 'true';
  const resetError = urlParams.get('error') || null;

  try {
    let orders = [];
    if (state.userId) {
      const response = await fetchUserOrders(state.userId);
      orders = response.orders || [];
    }
    mainContent.innerHTML = renderLogin(state.user, state.authMode, state.subscriptionPaid, orders, resetMode, resetError);
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    mainContent.innerHTML = renderLogin(state.user, state.authMode, state.subscriptionPaid, [], resetMode, resetError);
    if (window.lucide) window.lucide.createIcons();
  }
}

// Fetch & render user notifications
async function loadNotifications() {
  if (!state.userId) return;
  try {
    const res = await fetchNotifications(state.userId);
    state.notifications = res.notifications || [];
    updateNotificationsView();
  } catch (e) {
    console.warn('Failed to load notifications:', e);
  }
}

function renderNotificationDropdown(notifications, isOpen) {
  if (!isOpen) return '';
  const listHTML = notifications.length === 0
    ? `
      <div style="padding: 20px 16px; text-align: center; color: var(--color-text-muted); font-size: 0.85rem;">
        No notifications yet.
      </div>
    `
    : notifications.slice(0, 8).map(n => `
      <div class="notification-item" data-notification-id="${n.id}" style="padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: background 0.2s; border-left: 3px solid transparent;">
        <strong style="display: block; font-size: 0.9rem; color: #fff; margin-bottom: 4px;">${n.title}</strong>
        <p style="margin: 0; font-size: 0.8rem; color: var(--color-text-secondary); line-height: 1.4;">${n.message}</p>
        <span style="font-size: 0.7rem; color: var(--color-text-muted); display: block; margin-top: 4px;">
          ${new Date(n.created_at).toLocaleDateString()}
        </span>
      </div>
    `).join('');

  return `
    <div class="notification-dropdown glass" style="position: fixed; top: 75px; right: 20px; width: 320px; max-height: 400px; overflow-y: auto; border: 1px solid var(--border-glass); border-radius: 12px; z-index: 999; box-shadow: 0 10px 25px rgba(0,0,0,0.5); padding: 8px 0;">
      <div style="padding: 8px 16px; border-bottom: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center;">
        <h4 style="margin:0; font-family: var(--font-headings); font-size: 0.95rem; color: var(--color-accent);">Notifications</h4>
        <button id="clear-notifications-btn" style="background:none; border:none; color: var(--color-text-muted); font-size: 0.75rem; cursor: pointer; font-weight: 600;">Mark Read</button>
      </div>
      ${listHTML}
    </div>
  `;
}

function renderNotificationModal(notification) {
  if (!notification) return '';
  return `
    <div id="notification-modal" class="modal-backdrop notification-modal-backdrop" style="display: flex; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 1000; align-items: center; justify-content: center; padding: 20px; overflow: hidden;">
      <div class="modal-card glass notification-modal-card" style="max-width: 500px; width: 100%; max-height: 80vh; overflow: hidden; border: 1px solid var(--border-glass); border-radius: 16px; padding: 24px; position: relative; display: flex; flex-direction: column;">
        <button id="close-notification-modal" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.06); border: none; border-radius: 50%; width: 36px; height: 36px; color: var(--color-text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;">
          <i data-lucide="x"></i>
        </button>
        <div class="notification-modal-scroll" style="overflow-y: auto; padding-right: 8px;">
          <h2 style="font-family: var(--font-headings); font-size: 1.6rem; margin: 0 0 12px; line-height: 1.3; color: #fff;">${notification.title}</h2>
          <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 20px;">
            ${new Date(notification.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div style="font-size: 1rem; line-height: 1.6; color: var(--color-text-secondary); word-break: break-word; white-space: pre-wrap;">
            ${notification.message}
          </div>
        </div>
        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <button id="notification-modal-close-btn" class="btn btn-secondary" style="flex: 1; max-width: 200px;">Close</button>
        </div>
      </div>
    </div>
  `;
}

function updateNotificationsView() {
  const lastChecked = localStorage.getItem('bh_notifications_checked') || '1970-01-01T00:00:00.000Z';
  const unreadCount = state.notifications.filter(n => n.created_at > lastChecked).length;
  
  const badge = document.getElementById('global-notification-count');
  const bellBtn = document.getElementById('notification-bell-btn');
  
  if (bellBtn) {
    bellBtn.style.display = state.user ? '' : 'none';
  }

  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  const portal = document.getElementById('notification-portal');
  if (portal) {
    portal.innerHTML = renderNotificationDropdown(state.notifications, state.notificationsOpen);
    
    // Bind mark read action
    document.getElementById('clear-notifications-btn')?.addEventListener('click', () => {
      localStorage.setItem('bh_notifications_checked', new Date().toISOString());
      updateNotificationsView();
    });

    // Bind notification item clicks
    document.querySelectorAll('.notification-item[data-notification-id]').forEach(item => {
      item.addEventListener('click', () => {
        const notificationId = item.getAttribute('data-notification-id');
        const notification = state.notifications.find(n => String(n.id) === String(notificationId));
        if (notification) {
          openNotificationModal(notification);
        }
      });

      // Hover effect
      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(255,255,255,0.08)';
        item.style.borderLeftColor = 'var(--color-accent)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
        item.style.borderLeftColor = 'transparent';
      });
    });
  }
}

function openNotificationModal(notification) {
  // Remove existing modal if present
  const existingModal = document.getElementById('notification-modal');
  if (existingModal) existingModal.remove();

  // Create and insert modal
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = renderNotificationModal(notification);
  document.body.appendChild(modalContainer.firstElementChild);

  // Initialize Lucide icons in modal
  if (window.lucide) window.lucide.createIcons();

  const modal = document.getElementById('notification-modal');
  const closeBtn = document.getElementById('close-notification-modal');
  const closeBtnBottom = document.getElementById('notification-modal-close-btn');

  // Close button handler
  const closeModal = () => {
    if (modal) {
      modal.style.display = 'none';
      setTimeout(() => modal.remove(), 300);
    }
    document.body.classList.remove('notification-modal-open');
  };

  closeBtn?.addEventListener('click', closeModal);
  closeBtnBottom?.addEventListener('click', closeModal);

  // Close on backdrop click
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Back gesture support (ESC key & history back)
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onKeyDown);
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // Add body class for scroll prevention
  document.body.classList.add('notification-modal-open');
}

function getActiveNavHref(hash) {
  if (hash.startsWith('#/news')) return '#/news';
  if (hash.startsWith('#/roster') || hash.startsWith('#/player')) return '#/roster';
  if (hash.startsWith('#/game') || hash === '#/fixtures' || hash === '#/schedule') return '#/schedule';
  if (hash === '#/results') return '#/results';
  if (hash === '#/standings') return '#/standings';
  if (hash.startsWith('#/fanzone')) return '#/fanzone';
  if (hash.startsWith('#/login')) return '#/login';
  return hash || '#/home';
}

function updateActiveNavLink(hash = window.location.hash || '#/home') {
  const activeHref = getActiveNavHref(hash);
  document.querySelectorAll('.nav-link, .mobile-floating-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === activeHref);
  });
}

function bindSmartBackButtons(root = document) {
  root.querySelectorAll('[data-smart-back]').forEach(button => {
    if (button.dataset.backBound === 'true') return;
    button.dataset.backBound = 'true';
    button.addEventListener('click', () => {
      const fallback = button.dataset.backFallback || '#/home';
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = fallback;
      }
    });
  });
}

// Render the active route view
async function renderActivePage() {
  const hash = window.location.hash || '#/home';
  const mainContent = document.getElementById('main-content');

  if (!mainContent) return;
  updateCartButtonVisibility();

  window.scrollTo({ top: 0, behavior: 'instant' });

  mainContent.classList.remove('page-container');
  void mainContent.offsetWidth; // Trigger reflow
  mainContent.classList.add('page-container');

  let html = '';
  const rosterTeamMatch = hash.match(/^#\/roster\/([^\/]+)$/);
  const playerMatch = hash.match(/^#\/player\/([^\/]+)$/);
  const gameStatsMatch = hash.match(/^#\/game\/([^\/]+)$/);

  if (!gameStatsMatch && gameStatsInterval) {
    clearInterval(gameStatsInterval);
    gameStatsInterval = null;
  }

  if (rosterTeamMatch) {
    loadDynamicTeamPage(rosterTeamMatch[1]);
    return;
  } else if (playerMatch) {
    loadDynamicPlayerPage(playerMatch[1]);
    return;
  } else if (gameStatsMatch) {
    loadGameStatsPage(gameStatsMatch[1]);
    return;
  } else {
    switch (hash) {
        case '#/home':
        await loadHomePage();
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
      case '#/news':
        await loadNewsPage();
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
      case '#/gallery':
        await loadGalleryPage();
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
      case '#/roster':
        await loadRosterPage();
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
      case '#/fixtures':
      case '#/schedule':
        state.activeScheduleTab = 'schedule';
        await loadFixturesPage(false, state.gamesSearch, 'schedule');
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
      case '#/results':
        state.activeScheduleTab = 'results';
        await loadFixturesPage(false, state.gamesSearch, 'results');
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
      case '#/standings':
        state.activeScheduleTab = 'standings';
        await loadFixturesPage(false, state.gamesSearch, 'standings');
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
      case '#/trophy':
        html = renderTrophy();
        break;
      case '#/impact':
        html = renderImpact();
        break;
      case '#/login':
        await loadLoginPage();
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
      case '#/fanzone':
        await refreshSubscriptionStatus();
        await loadExchangeRate();
        html = renderFanZone(state.products, state.exchangeRate, state.productSearch, state.subscriptionPaid);
        break;
      default:
        await loadHomePage();
        updateActiveNavLink(hash);
        updateCartView();
        if (state.user) updateNotificationsView();
        return;
    }
  }

  mainContent.innerHTML = html;

  // Toggle navigation links based on authentication state
  const navLinks = document.getElementById('nav-links');
  const bellBtn = document.getElementById('notification-bell-btn');
  if (navLinks) {
    navLinks.classList.remove('nav-auth-hidden');
  }
  updateCartButtonVisibility();
  if (bellBtn) bellBtn.style.display = state.user ? '' : 'none';

  updateActiveNavLink(hash);

  updateCartView();
  if (state.user) {
    updateNotificationsView();
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
  bindSmartBackButtons();
}

// Apply theme choices
function applyTheme() {
  const body = document.body;
  const themeBtn = document.getElementById('theme-toggle-btn');
  
  if (state.theme === 'light') {
    body.classList.add('light-theme');
    if (themeBtn) themeBtn.innerHTML = '<i data-lucide="moon"></i>';
  } else {
    body.classList.remove('light-theme');
    if (themeBtn) themeBtn.innerHTML = '<i data-lucide="sun"></i>';
  }

  updateLogoSrc();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateLogoSrc() {
  const logoImg = document.getElementById('site-logo-img');
  if (!logoImg) return;
  const lightLogo = './src/assets/logo1.png';
  const darkLogo = './src/assets/logo.png';
  logoImg.src = state.theme === 'light' ? lightLogo : darkLogo;
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  applyTheme();
}

// Update Cart DOM drawer
function updateCartView() {
  const badge = document.getElementById('global-cart-count');
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  if (badge) {
    badge.textContent = count;
    badge.style.transform = 'scale(1.25)';
    setTimeout(() => badge.style.transform = 'scale(1)', 150);
  }

  const portal = document.getElementById('cart-portal');
  if (portal) {
    portal.innerHTML = renderCartDrawer(state.cart, state.cartOpen, state.mobileMoneyMethod, state.exchangeRate);
    bindCartDrawerListeners();
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }

  updateCartButtonVisibility();
}

function updateCartButtonVisibility() {
  const cartBtn = document.getElementById('cart-toggle-btn');
  if (!cartBtn) return;

  const hash = window.location.hash || '#/home';
  const shouldShowCart = Boolean(state.user) && hash === '#/fanzone';
  cartBtn.style.display = shouldShowCart ? 'flex' : 'none';
}

function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function handleScrollPosition() {
  const header = document.getElementById('site-header');
  if (!header) return;
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

// Set up event listeners
function setupEventListeners() {
  window.addEventListener('scroll', handleScrollPosition);
  window.addEventListener('hashchange', renderActivePage);

  document.addEventListener('click', (e) => {
    // Theme toggle
    const themeBtn = e.target.closest('#theme-toggle-btn');
    if (themeBtn) {
      toggleTheme();
      return;
    }

    // Notification dropdown toggle
    const bellBtn = e.target.closest('#notification-bell-btn');
    if (bellBtn) {
      state.notificationsOpen = !state.notificationsOpen;
      if (state.notificationsOpen) {
        localStorage.setItem('bh_notifications_checked', new Date().toISOString());
      }
      updateNotificationsView();
      return;
    }
    
    // Close dropdown on click outside
    if (!e.target.closest('.notification-dropdown') && state.notificationsOpen) {
      state.notificationsOpen = false;
      updateNotificationsView();
    }

    // Mobile nav toggle
    const menuToggle = e.target.closest('#mobile-nav-toggle');
    if (menuToggle) {
      toggleMobileMenu();
      return;
    }

    const navLink = e.target.closest('.nav-link');
    if (navLink && state.mobileMenuOpen) {
      toggleMobileMenu(false);
    }

    if (state.mobileMenuOpen && !e.target.closest('#nav-links') && !e.target.closest('#mobile-nav-toggle')) {
      toggleMobileMenu(false);
    }

    // Cart drawer toggle
    const cartToggle = e.target.closest('#cart-toggle-btn');
    if (cartToggle) {
      state.cartOpen = true;
      updateCartView();
      return;
    }

    const productSearchInput = e.target.closest('#product-search-input');
    if (productSearchInput) {
      return;
    }

    // Player card flips
    const playerCard = e.target.closest('.player-card');
    if (playerCard && !e.target.closest('a')) {
      playerCard.classList.toggle('flipped');
      return;
    }

    // Add to cart
    const addBtn = e.target.closest('[data-add-to-cart]');
    if (addBtn) {
      if (!state.user) {
        ask('Create an account or log in to add items to your cart. Go to MyAccount now?', 'Login required').then(confirmed => {
          if (confirmed) window.location.hash = '#/login';
        });
        return;
      }
      const pId = addBtn.getAttribute('data-add-to-cart');
      addToCart(pId);
      return;
    }

    // Auth toggle
    const modeBtn = e.target.closest('[data-auth-mode]');
    if (modeBtn) {
      state.authMode = modeBtn.getAttribute('data-auth-mode');
      renderActivePage();
      return;
    }

    // Action clicks (Mobile payments / Logout)
    const paySubBtn = e.target.closest('[data-pay-subscription]');
    if (paySubBtn) {
      addSubscriptionToCart();
      return;
    }

    const selectMMBtn = e.target.closest('[data-select-mobile-money]');
    if (selectMMBtn) {
      selectMobileMoneyMethod(selectMMBtn.getAttribute('data-select-mobile-money'));
      return;
    }

    const confirmPayBtn = e.target.closest('[data-confirm-mobile-payment]');
    if (confirmPayBtn) {
      confirmMobileMoneyPayment();
      return;
    }

    const logoutBtn = e.target.closest('[data-logout]');
    if (logoutBtn) {
      state.user = null;
      state.userId = null;
      state.authMode = 'login';
      state.cart = [];
      localStorage.removeItem('bh_user');
      localStorage.removeItem('bh_user_id');
      localStorage.removeItem('bh_subscription_paid');
      
      const navLinks = document.getElementById('nav-links');
      const bellBtn = document.getElementById('notification-bell-btn');
      if (navLinks) {
        navLinks.classList.add('nav-auth-hidden');
        navLinks.classList.remove('mobile-open');
      }
      updateCartButtonVisibility();
      if (bellBtn) bellBtn.style.display = 'none';
      
      window.location.hash = '#/login';
      renderActivePage();
    }
  });

  // Handle Login Form Submit
  document.addEventListener('input', debounce(async (e) => {
    const productSearchInput = e.target.closest('#product-search-input');
    if (!productSearchInput) return;

    const value = productSearchInput.value;
    state.productSearch = value.trim();
    await loadProducts(state.productSearch);

    const mainContent = document.getElementById('main-content');
    if (mainContent && window.location.hash === '#/fanzone') {
      mainContent.innerHTML = renderFanZone(state.products, state.exchangeRate, state.productSearch, state.subscriptionPaid);
      if (window.lucide) window.lucide.createIcons();
      restoreInputFocus('product-search-input', value);
    }
  }, 350));

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('#login-form');
    if (form) {
      e.preventDefault();
      const resetMode = form.querySelector('[name="reset_mode"]')?.value === 'true';
      const resetToken = form.querySelector('[name="reset_token"]')?.value.trim();

      if (resetMode) {
        const password = form.querySelector('[name="password"]')?.value;
        const confirm = form.querySelector('[name="confirm_password"]')?.value;

        if (!password || !confirm) {
          notify('Please enter and confirm your new password.', 'Missing password', 'warning');
          return;
        }
        if (password !== confirm) {
          notify('Passwords do not match.', 'Check password', 'warning');
          return;
        }
        if (password.length < 6) {
          notify('Password must be at least 6 characters.', 'Password too short', 'warning');
          return;
        }
        if (!resetToken) {
          notify('Missing reset token.', 'Reset link invalid', 'error');
          return;
        }

        try {
          await resetPassword(resetToken, password);
          await notify('Password reset successful! You can now log in with your new password.', 'Password reset', 'success');
          state.authMode = 'login';
          window.location.hash = '#/login';
          renderActivePage();
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      const email = form.querySelector('[name="email"]')?.value.trim();
      const password = form.querySelector('[name="password"]')?.value;

      if (state.authMode === 'forgot') {
        try {
          await forgotPassword(email);
          await notify('If an account with that email exists, a password reset link has been sent. Please check your inbox.', 'Check your email', 'success');
          state.authMode = 'login';
          renderActivePage();
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      if (state.authMode === 'register') {
        const name = form.querySelector('[name="name"]')?.value.trim();
        const confirm = form.querySelector('[name="confirm_password"]')?.value;
        if (!name || !email || !password || !confirm) {
          notify('Please complete all fields to sign up.', 'Missing details', 'warning');
          return;
        }
        if (password !== confirm) {
          notify('Passwords do not match.', 'Check password', 'warning');
          return;
        }
        try {
          const response = await registerUser(name, email, password);
          state.user = response.email;
          state.userId = response.userId;
          state.subscriptionPaid = response.subscriptionPaid;
          localStorage.setItem('bh_user', response.email);
          localStorage.setItem('bh_user_id', response.userId);
          localStorage.setItem('bh_subscription_paid', String(response.subscriptionPaid));
          state.authMode = 'login';
          
          const navLinks = document.getElementById('nav-links');
          const bellBtn = document.getElementById('notification-bell-btn');
          if (navLinks) navLinks.classList.remove('nav-auth-hidden');
          updateCartButtonVisibility();
          if (bellBtn) bellBtn.style.display = '';
          
          window.location.hash = '#/home';
          await loadNotifications();
          renderActivePage();
        } catch (error) {
          alert(error.message);
        }
        return;
      }

      if (!email || !password) {
        notify('Please enter email and password.', 'Missing login details', 'warning');
        return;
      }
      try {
        const response = await loginUser(email, password);
        state.user = response.email;
        state.userId = response.userId;
        state.subscriptionPaid = response.subscriptionStatus === 'active';
        localStorage.setItem('bh_user', response.email);
        localStorage.setItem('bh_user_id', response.userId);
        localStorage.setItem('bh_subscription_paid', String(state.subscriptionPaid));
        
        const navLinks = document.getElementById('nav-links');
        const bellBtn = document.getElementById('notification-bell-btn');
        if (navLinks) navLinks.classList.remove('nav-auth-hidden');
        updateCartButtonVisibility();
        if (bellBtn) bellBtn.style.display = '';
        
        window.location.hash = '#/home';
        await loadNotifications();
        renderActivePage();
      } catch (error) {
        alert(error.message);
      }
    }
  });
}

function bindCartDrawerListeners() {
  const closeBtn = document.getElementById('close-cart-btn');
  const backdrop = document.getElementById('cart-backdrop');
  
  const closeCart = () => {
    state.cartOpen = false;
    updateCartView();
  };
  
  if (closeBtn) closeBtn.addEventListener('click', closeCart);
  if (backdrop) backdrop.addEventListener('click', closeCart);

  document.querySelectorAll('[data-remove-from-cart]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pId = e.currentTarget.getAttribute('data-remove-from-cart');
      removeFromCart(pId);
    });
  });

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', checkoutWithMobileMoney);
  }
}

async function checkoutWithMobileMoney() {
  if (!state.cart.length) {
    notify('Please add items to your cart.', 'Cart is empty', 'warning');
    return;
  }
  if (!state.mobileMoneyMethod) {
    notify('Please select a payment method.', 'Payment method required', 'warning');
    return;
  }
  if (!state.userId) {
    notify('Please log in.', 'Login required', 'warning');
    return;
  }

  const mobileMoneyNumber = await promptDialog(
    `Enter your ${state.mobileMoneyMethod} phone number for payment.`,
    'Mobile money number',
    { type: 'tel', placeholder: '+265...', value: '' }
  );
  
  if (!mobileMoneyNumber) return;

  try {
    const order = await createOrder({
      userId: Number(state.userId),
      items: state.cart.map(item => ({ productId: item.id, quantity: item.quantity })),
      paymentMethod: state.mobileMoneyMethod,
      mobileMoneyNumber
    });

    state.activeOrderId = order.orderId;
    state.activeOrderReference = order.reference;
    state.cartOpen = true;
    updateCartView();

    notify(`Use ${state.mobileMoneyMethod} to pay:\n${state.mobileMoneyMethod === 'Airtel Money' ? 'Airtel Money paybill: 23242' : 'TNM Mpamba paybill: 12345'}\nBusiness Name: Bravehearts\nReference: ${order.reference}\n\nAfter payment, press Confirm Payment in the cart.`, 'Payment instructions', 'info');
  } catch (error) {
    alert(error.message);
  }
}

async function confirmMobileMoneyPayment() {
  if (!state.activeOrderId) {
    notify('No order available to confirm.', 'No active order', 'warning');
    return;
  }

  try {
    const hadSubscriptionItem = state.cart.some(item => isSubscriptionProduct(item));
    await confirmPayment(state.activeOrderId);
    if (hadSubscriptionItem) {
      state.subscriptionPaid = true;
      localStorage.setItem('bh_subscription_paid', 'true');
    }
    state.cart = [];
    state.cartOpen = false;
    state.mobileMoneyMethod = null;
    state.activeOrderId = null;
    state.activeOrderReference = null;
    notify('Payment confirmed! Order marked as PAID.', 'Payment confirmed', 'success');
    updateCartView();
    if (state.userId) {
      await loadNotifications();
    }
  } catch (error) {
    alert(error.message);
  }
}

function selectMobileMoneyMethod(method) {
  state.mobileMoneyMethod = method;
  updateCartView();
}

function addSubscriptionToCart() {
  if (state.subscriptionPaid) {
    notify('Your subscription is already active. The subscription fee will appear again when your subscription period ends.', 'Subscription active', 'info');
    return;
  }

  const subscriptionProduct = state.products.find(p => isSubscriptionProduct(p));
  if (!subscriptionProduct) return;

  const existing = state.cart.find(item => item.id === subscriptionProduct.id);
  if (existing) {
    existing.quantity = 1;
  } else {
    state.cart.push({ ...subscriptionProduct, quantity: 1 });
  }
  state.cartOpen = true;
  updateCartView();
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product) return;

  if (state.subscriptionPaid && isSubscriptionProduct(product)) {
    notify('Your subscription is already active. The subscription fee will appear again when your subscription period ends.', 'Subscription active', 'info');
    return;
  }

  const existing = state.cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ ...product, quantity: 1 });
  }

  updateCartView();
}

function removeFromCart(productId) {
  const existingIndex = state.cart.findIndex(item => item.id === productId);
  if (existingIndex > -1) {
    const existing = state.cart[existingIndex];
    if (existing.quantity > 1) {
      existing.quantity -= 1;
    } else {
      state.cart.splice(existingIndex, 1);
    }
  }
  updateCartView();
}

function toggleMobileMenu(forceOpen) {
  state.mobileMenuOpen = typeof forceOpen === 'boolean' ? forceOpen : !state.mobileMenuOpen;
  const navLinks = document.getElementById('nav-links');
  const menuIcon = document.querySelector('#mobile-nav-toggle i');
  const menuButton = document.getElementById('mobile-nav-toggle');
  if (!navLinks) return;
  
  navLinks.classList.toggle('mobile-open', state.mobileMenuOpen);

  if (menuButton) {
    menuButton.setAttribute('aria-expanded', String(state.mobileMenuOpen));
    menuButton.setAttribute('aria-label', state.mobileMenuOpen ? 'Close page menu' : 'Open page menu');
  }

  if (menuIcon && window.lucide) {
    menuIcon.setAttribute('data-lucide', state.mobileMenuOpen ? 'x' : 'menu');
    window.lucide.createIcons();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    initApp().catch(renderStartupError);
  });
} else {
  initApp().catch(renderStartupError);
}
