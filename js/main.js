/**
 * Interpretone - Main JavaScript
 * Homepage - Search & Browse with Responsive Navigation
 */

// ===== IMPORTS =====
import { searchSongs, formatArtistName, debounce } from './genius-api.js';
import { getRecentTafsiran, getPopularTafsiran } from './db.js';
import { saveSearchHistory, getSearchHistory } from './storage.js';

// ===== DOM ELEMENTS =====
let searchInput, searchButton, searchResults;
let recentTafsiranContainer, popularTafsiranContainer;
let loadingIndicator, searchHistoryContainer;
let hamburger, navMenu;

// ===== STATE =====
let currentSearchResults = [];

// ===== INITIALIZATION =====
async function init() {
  console.log('🎵 Interpretone - Homepage initialized');
  
  // Get DOM elements
  searchInput = document.getElementById('searchInput');
  searchButton = document.getElementById('searchButton');
  searchResults = document.getElementById('searchResults');
  recentTafsiranContainer = document.getElementById('recentTafsiran');
  popularTafsiranContainer = document.getElementById('popularTafsiran');
  loadingIndicator = document.getElementById('loading');
  searchHistoryContainer = document.getElementById('searchHistory');
  hamburger = document.getElementById('hamburger');
  navMenu = document.getElementById('navMenu');
  
  // Setup features
  setupResponsiveNav();
  setupResizableNav();
  setupSearch();
  displaySearchHistory();
  
  // Load content
  await loadRecentTafsiran();
  await loadPopularTafsiran();
}

// ===== RESPONSIVE NAVIGATION =====
function setupResponsiveNav() {
  if (!hamburger || !navMenu) return;
  
  // Toggle menu on hamburger click
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
  });
  
  // Close menu when clicking nav links
  const navLinks = navMenu.querySelectorAll('.nav-link, .nav-btn');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      document.body.style.overflow = '';
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
  
  // Close menu on window resize to desktop size
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
}

// ===== RESIZABLE NAVBAR ON SCROLL =====
function setupResizableNav() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  
  let lastScrollY = window.scrollY;
  let ticking = false;
  
  const updateNavbar = () => {
    const scrollY = window.scrollY;
    
    // Add/remove scrolled class based on scroll position
    if (scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    lastScrollY = scrollY;
    ticking = false;
  };
  
  const requestTick = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateNavbar);
      ticking = true;
    }
  };
  
  // Listen to scroll event with requestAnimationFrame for better performance
  window.addEventListener('scroll', requestTick, { passive: true });
  
  // Initial check
  updateNavbar();
}

// ===== SEARCH FUNCTIONALITY =====
function setupSearch() {
  if (!searchInput || !searchButton) return;
  
  // Debounced search for live results
  const debouncedSearch = debounce(async (query) => {
    if (query.trim().length < 3) {
      searchResults.innerHTML = '';
      return;
    }
    await performSearch(query);
  }, 2000);

  // Input event - live search
  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });

  // Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(searchInput.value);
    }
  });

  // Search button click
  searchButton.addEventListener('click', () => {
    performSearch(searchInput.value);
  });
}

// ===== PERFORM SEARCH =====
async function performSearch(query) {
  if (!query || query.trim().length < 2) {
    showMessage('Masukkan minimal 2 karakter untuk mencari', 'warning');
    return;
  }

  showLoading(true);
  searchResults.innerHTML = '<p class="searching-text">Mencari lagu...</p>';

  try {
    const results = await searchSongs(query);
    currentSearchResults = results;

    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="no-results">
          <p>❌ Tidak ada hasil untuk "${escapeHtml(query)}"</p>
          <p class="text-sm">Coba kata kunci lain atau cek ejaan</p>
        </div>
      `;
      return;
    }

    // Save to search history
    saveSearchHistory(query);
    displaySearchHistory();

    // Display results
    displaySearchResults(results);

  } catch (error) {
    console.error('Search error:', error);
    searchResults.innerHTML = `
      <div class="error-results">
        <p>⚠️ Gagal mencari lagu</p>
        <p class="text-sm">Coba lagi dalam beberapa saat</p>
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

// ===== DISPLAY SEARCH RESULTS =====
function displaySearchResults(results) {
  searchResults.innerHTML = `
    <h3 class="results-title">Hasil Pencarian (${results.length})</h3>
    <div class="search-results-grid">
      ${results.map(song => `
        <a href="song.html?id=${song.id}" class="song-card">
          <img src="${song.albumArt}" alt="${escapeHtml(song.title)}" class="song-cover" loading="lazy">
          <div class="song-info">
            <h4 class="song-title">${escapeHtml(song.title)}</h4>
            <p class="song-artist">${escapeHtml(formatArtistName(song.artist))}</p>
            ${song.releaseDate ? `<p class="song-year">${escapeHtml(song.releaseDate)}</p>` : ''}
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

// ===== LOAD RECENT TAFSIRAN =====
async function loadRecentTafsiran() {
  if (!recentTafsiranContainer) return;
  
  try {
    const tafsiran = await getRecentTafsiran(6);
    
    if (tafsiran.length === 0) {
      recentTafsiranContainer.innerHTML = `
        <div class="empty-state">
          <p>📝 Belum ada tafsiran.</p>
          <p>Jadilah yang pertama! 🎵</p>
        </div>
      `;
      return;
    }

    recentTafsiranContainer.innerHTML = tafsiran.map(t => `
      <div class="tafsiran-card" onclick="window.location.href='song.html?id=${t.geniusId}'">
        <div class="tafsiran-header">
          <h4 class="tafsiran-song">${escapeHtml(t.songTitle)}</h4>
          <p class="tafsiran-artist">${escapeHtml(t.artist)}</p>
        </div>
        <p class="tafsiran-preview">${escapeHtml(truncateText(t.interpretation, 120))}</p>
        <div class="tafsiran-footer">
          <span class="tafsiran-author">👤 ${escapeHtml(t.author)}</span>
          <span class="tafsiran-stats">
            ❤️ ${t.rating || 0} · 👁️ ${t.viewCount || 0}
          </span>
        </div>
        <span class="tafsiran-date">${formatDate(t.createdAt)}</span>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading recent tafsiran:', error);
    recentTafsiranContainer.innerHTML = '<p class="error-state">⚠️ Gagal memuat tafsiran terbaru</p>';
  }
}

// ===== LOAD POPULAR TAFSIRAN =====
async function loadPopularTafsiran() {
  if (!popularTafsiranContainer) return;
  
  try {
    const tafsiran = await getPopularTafsiran(6);
    
    if (tafsiran.length === 0) {
      popularTafsiranContainer.innerHTML = `
        <div class="empty-state">
          <p>🏆 Belum ada tafsiran populer</p>
        </div>
      `;
      return;
    }

    popularTafsiranContainer.innerHTML = tafsiran.map(t => `
      <div class="tafsiran-card" onclick="window.location.href='song.html?id=${t.geniusId}'">
        <div class="tafsiran-header">
          <h4 class="tafsiran-song">${escapeHtml(t.songTitle)}</h4>
          <p class="tafsiran-artist">${escapeHtml(t.artist)}</p>
        </div>
        <p class="tafsiran-preview">${escapeHtml(truncateText(t.interpretation, 120))}</p>
        <div class="tafsiran-footer">
          <span class="tafsiran-author">👤 ${escapeHtml(t.author)}</span>
          <span class="tafsiran-stats">
            ❤️ ${t.rating || 0} · 👁️ ${t.viewCount || 0}
          </span>
        </div>
        <span class="tafsiran-date">${formatDate(t.createdAt)}</span>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading popular tafsiran:', error);
    popularTafsiranContainer.innerHTML = '<p class="error-state">⚠️ Gagal memuat tafsiran populer</p>';
  }
}

// ===== DISPLAY SEARCH HISTORY =====
function displaySearchHistory() {
  if (!searchHistoryContainer) return;
  
  const history = getSearchHistory().slice(0, 5);
  
  if (history.length === 0) {
    searchHistoryContainer.innerHTML = '';
    return;
  }

  searchHistoryContainer.innerHTML = `
    <h4 class="history-title">Pencarian Terakhir:</h4>
    <div class="search-history-tags">
      ${history.map(q => `
        <button class="history-tag" data-query="${escapeHtml(q)}">
          ${escapeHtml(q)}
        </button>
      `).join('')}
    </div>
  `;
  
  // Add click handlers to history tags
  const historyTags = searchHistoryContainer.querySelectorAll('.history-tag');
  historyTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const query = tag.getAttribute('data-query');
      searchInput.value = query;
      performSearch(query);
    });
  });
}

// ===== SHOW LOADING =====
function showLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
  }
}

// ===== SHOW MESSAGE TOAST =====
function showMessage(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== UTILITY FUNCTIONS =====
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`;
  
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== INITIALIZE ON DOM READY =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ===== SMOOTH SCROLLING FOR ANCHOR LINKS =====
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (link) {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
});