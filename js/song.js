/**
 * Song Detail Page - Display lyrics & tafsiran
 */

import { getFullSongData, cleanLyrics } from './genius-api.js';
import { 
  getTafsiranByGeniusId, 
  addTafsiran, 
  addComment, 
  getCommentsByTafsirId,
  toggleLike,
  hasUserLiked,
  incrementViewCount 
} from './db.js';
import { saveRecentlyViewed, getSavedUsername, saveUsername } from './storage.js';
import { auth } from './firebase-config.js';

// DOM Elements
let songInfoContainer, lyricsContainer, tafsiranListContainer, submitFormContainer;
let loadingIndicator;

// State
let currentSong = null;
let currentGeniusId = null;

/**
 * Initialize song page
 */
async function init() {
  console.log('🎵 Song page initialized');
  
  // Get DOM elements
  songInfoContainer = document.getElementById('songInfo');
  lyricsContainer = document.getElementById('lyrics');
  tafsiranListContainer = document.getElementById('tafsiranList');
  submitFormContainer = document.getElementById('submitForm');
  loadingIndicator = document.getElementById('loading');
  
  // Get song ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentGeniusId = parseInt(urlParams.get('id'));
  
  if (!currentGeniusId || isNaN(currentGeniusId)) {
    showMessage('ID lagu tidak valid', 'error');
    setTimeout(() => window.location.href = 'index.html', 2000);
    return;
  }
  
  // Load song data
  await loadSongData();
  await loadTafsiran();
  
  // Setup form
  setupSubmitForm();
}

/**
 * Load song data from Genius API (With Fallback to Indo Scraper)
 */
async function loadSongData() {
  showLoading(true);
  
  try {
    // 1. Ambil data utama dari Genius
    currentSong = await getFullSongData(currentGeniusId);
    
    if (!currentSong) {
      showMessage('Lagu tidak ditemukan', 'error');
      setTimeout(() => window.location.href = 'index.html', 2000);
      return;
    }

    // --- LOGIKA BARU DIMULAI DI SINI ---
    
    // Cek apakah lirik dari Genius valid
    const isGeniusLyricsValid = currentSong.lyrics && 
                                currentSong.lyrics !== 'Lirik tidak tersedia untuk lagu ini.' && 
                                currentSong.lyrics.length > 100;

    // Jika Genius gagal, coba cari pakai Scraper Indo kita
    if (!isGeniusLyricsValid) {
        console.log('⚠️ Lirik Genius kosong, mencoba scraper Indonesia...');
        try {
            // Panggil API Vercel kita sendiri
            const fallbackRes = await fetch(`/api/lyrics-indo?artist=${encodeURIComponent(currentSong.artist)}&title=${encodeURIComponent(currentSong.title)}`);
            
            if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                if (fallbackData.lyrics) {
                    console.log('✅ Lirik ditemukan via Scraper Indo!');
                    currentSong.lyrics = fallbackData.lyrics;
                }
            }
        } catch (err) {
            console.warn('Scraper Indo juga gagal:', err);
            // Biarkan kosong, nanti akan dihandle displayLyrics
        }
    }
    // --- LOGIKA BARU SELESAI ---
    
    // Update page title
    document.title = `${currentSong.title} - ${currentSong.artist} | Interpretone`;
    
    // Display song info
    displaySongInfo(currentSong);
    
    // Display lyrics
    displayLyrics(currentSong.lyrics);
    
    // Save to recently viewed (localStorage)
    saveRecentlyViewed({
      id: currentSong.id,
      title: currentSong.title,
      artist: currentSong.artist,
      albumArt: currentSong.albumArt
    });
    
  } catch (error) {
    console.error('Error loading song:', error);
    showMessage('Gagal memuat data lagu', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Display song information
 */
function displaySongInfo(song) {
  if (!songInfoContainer) return;
  
  songInfoContainer.innerHTML = `
    <div class="song-header">
      <img src="${song.albumArt}" alt="${song.title}" class="song-cover-large">
      <div class="song-meta">
        <h1 class="song-title-large">${song.title}</h1>
        <h2 class="song-artist-large">${song.artist}</h2>
        ${song.album ? `<p class="song-album">💿 Album: ${song.album}</p>` : ''}
        ${song.releaseDate ? `<p class="song-release">📅 Released: ${song.releaseDate}</p>` : ''}
        ${song.featuredArtists && song.featuredArtists.length > 0 ? 
          `<p class="song-featured">🎤 Featuring: ${song.featuredArtists.join(', ')}</p>` : ''}
        <a href="${song.url}" target="_blank" rel="noopener" class="btn-secondary">
          Lihat di Genius →
        </a>
      </div>
    </div>
  `;
}

/**
 * Display lyrics
 */
/**
 * Display lyrics
 */
function displayLyrics(lyrics) {
  if (!lyricsContainer) return;
  
  // Cek apakah lyrics valid
  const isValidLyrics = lyrics && 
                        lyrics !== 'Lirik tidak tersedia untuk lagu ini.' && 
                        lyrics.length > 50;
  
  if (isValidLyrics) {
    const cleanedLyrics = cleanLyrics(lyrics);
    lyricsContainer.innerHTML = `
      <h2 class="section-title">📝 Lirik</h2>
      <div class="lyrics-text">${cleanedLyrics.replace(/\n/g, '<br>')}</div>
    `;
  } else {
    // Fallback: tampilkan pesan dan link ke Genius
    lyricsContainer.innerHTML = `
      <h2 class="section-title">📝 Lirik</h2>
      <div class="lyrics-placeholder">
        <p>⚠️ Lirik tidak dapat ditampilkan di sini.</p>
        <p class="text-sm">Lirik untuk lagu ini mungkin tidak tersedia di database kami.</p>
        <a href="${currentSong.url}" target="_blank" rel="noopener" class="btn-primary" style="margin-top: 1rem;">
          Lihat Lirik di Genius →
        </a>
      </div>
    `;
  }
}
/**
 * Load all tafsiran for this song from Firebase
 */
async function loadTafsiran() {
  if (!tafsiranListContainer) return;
  
  try {
    const tafsiran = await getTafsiranByGeniusId(currentGeniusId);
    
    if (tafsiran.length === 0) {
      tafsiranListContainer.innerHTML = `
        <h2 class="section-title">💭 Tafsiran & Interpretasi</h2>
        <div class="empty-state">
          <p>Belum ada tafsiran untuk lagu ini.</p>
          <p>Jadilah yang pertama memberikan interpretasi! 🎵</p>
        </div>
      `;
      return;
    }
    
    // Display each tafsiran
    const tafsiranHTML = await Promise.all(tafsiran.map(t => renderTafsiran(t)));
    
    tafsiranListContainer.innerHTML = `
      <h2 class="section-title">💭 Tafsiran & Interpretasi (${tafsiran.length})</h2>
      <div class="tafsiran-list">
        ${tafsiranHTML.join('')}
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading tafsiran:', error);
    tafsiranListContainer.innerHTML = '<p class="error-state">⚠️ Gagal memuat tafsiran</p>';
  }
}

/**
 * Render single tafsiran card
 */
async function renderTafsiran(tafsir) {
  const isLiked = await hasUserLiked(tafsir.id);
  const comments = await getCommentsByTafsirId(tafsir.id);
  
  return `
    <div class="tafsiran-card-full" data-tafsir-id="${tafsir.id}">
      <div class="tafsiran-header">
        <div class="tafsiran-author-info">
          <span class="author-avatar">👤</span>
          <div>
            <strong class="author-name">${tafsir.author}</strong>
            <span class="tafsiran-date">${formatDate(tafsir.createdAt)}</span>
          </div>
        </div>
        <div class="tafsiran-stats-mini">
          👁️ ${tafsir.viewCount || 0}
        </div>
      </div>
      
      <div class="tafsiran-content">
        ${tafsir.interpretation.replace(/\n/g, '<br>')}
      </div>
      
      <div class="tafsiran-actions">
        <button class="btn-like ${isLiked ? 'liked' : ''}" onclick="handleLike('${tafsir.id}')">
          ${isLiked ? '❤️' : '🤍'} ${tafsir.rating || 0}
        </button>
        <button class="btn-comment" onclick="toggleComments('${tafsir.id}')">
          💬 ${comments.length}
        </button>
      </div>
      
      <div class="comments-section" id="comments-${tafsir.id}" style="display: none;">
        ${renderComments(comments, tafsir.id)}
      </div>
    </div>
  `;
}

/**
 * Render comments section
 */
function renderComments(comments, tafsirId) {
  const commentsHtml = comments.map(c => `
    <div class="comment">
      <div class="comment-header">
        <strong class="comment-author">${c.author}</strong>
        <span class="comment-date">${formatDate(c.createdAt)}</span>
      </div>
      <p class="comment-content">${c.content}</p>
    </div>
  `).join('');
  
  return `
    <div class="comments-list">
      ${commentsHtml || '<p class="no-comments">Belum ada komentar</p>'}
    </div>
    <div class="comment-form">
      <input type="text" 
             placeholder="Tulis komentar..." 
             id="comment-input-${tafsirId}"
             class="input-field"
             maxlength="500">
      <button onclick="submitComment('${tafsirId}')" class="btn-primary btn-small">Kirim</button>
    </div>
  `;
}

/**
 * Setup submit tafsiran form
 */
function setupSubmitForm() {
  if (!submitFormContainer) return;
  
  const savedUsername = getSavedUsername();
  
  submitFormContainer.innerHTML = `
    <h2 class="section-title">✍️ Tambah Tafsiran Kamu</h2>
    <form id="tafsirForm" class="tafsir-form">
      <div class="form-group">
        <label for="authorName">Nama Kamu *</label>
        <input type="text" 
               id="authorName" 
               class="input-field" 
               placeholder="Masukkan nama kamu"
               value="${savedUsername}"
               maxlength="50"
               required>
        <small>Nama akan tersimpan untuk pengisian berikutnya</small>
      </div>
      
      <div class="form-group">
        <label for="interpretation">Interpretasi / Tafsiran *</label>
        <textarea id="interpretation" 
                  class="input-field" 
                  rows="10"
                  placeholder="Tuliskan interpretasi kamu tentang lagu ini...

Contoh:
- Apa makna di balik liriknya?
- Apa yang ingin disampaikan artis?
- Bagaimana pengalaman pribadi kamu dengan lagu ini?
- Analisis metafora atau simbolisme dalam lirik"
                  minlength="50"
                  maxlength="5000"
                  required></textarea>
        <small id="charCount">Min. 50 karakter</small>
      </div>
      
      <button type="submit" class="btn-primary btn-large">Kirim Tafsiran 🎵</button>
    </form>
  `;
  
  // Character counter
  const textarea = document.getElementById('interpretation');
  const charCount = document.getElementById('charCount');
  
  textarea.addEventListener('input', () => {
    const length = textarea.value.length;
    charCount.textContent = length < 50 ? 
      `Min. 50 karakter (${length}/50)` : 
      `${length}/5000 karakter`;
  });
  
  // Handle form submission
  document.getElementById('tafsirForm').addEventListener('submit', handleSubmitTafsiran);
}

/**
 * Handle tafsiran submission
 */
async function handleSubmitTafsiran(e) {
  e.preventDefault();
  
  const authorName = document.getElementById('authorName').value.trim();
  const interpretation = document.getElementById('interpretation').value.trim();
  
  if (!authorName || !interpretation) {
    showMessage('Mohon isi semua field', 'warning');
    return;
  }
  
  if (interpretation.length < 50) {
    showMessage('Tafsiran minimal 50 karakter', 'warning');
    return;
  }
  
  if (!auth.currentUser) {
    showMessage('Menunggu autentikasi...', 'warning');
    return;
  }
  
  showLoading(true);
  
  try {
    await addTafsiran({
      geniusId: currentGeniusId,
      songTitle: currentSong.title,
      artist: currentSong.artist,
      interpretation: interpretation,
      author: authorName
    });
    
    // Save username to localStorage
    saveUsername(authorName);
    
    showMessage('Tafsiran berhasil ditambahkan! 🎉', 'success');
    
    // Reset form
    document.getElementById('interpretation').value = '';
    document.getElementById('charCount').textContent = 'Min. 50 karakter';
    
    // Reload tafsiran
    await loadTafsiran();
    
    // Scroll to tafsiran list
    tafsiranListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
  } catch (error) {
    console.error('Error submitting tafsiran:', error);
    showMessage('Gagal menambahkan tafsiran. Coba lagi.', 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Handle like button (Global function)
 */
window.handleLike = async function(tafsirId) {
  try {
    await toggleLike(tafsirId);
    
    // Reload to update UI
    await loadTafsiran();
    
  } catch (error) {
    console.error('Error toggling like:', error);
    showMessage('Gagal memberikan like', 'error');
  }
};

/**
 * Toggle comments visibility (Global function)
 */
window.toggleComments = function(tafsirId) {
  const commentsSection = document.getElementById(`comments-${tafsirId}`);
  if (commentsSection) {
    const isVisible = commentsSection.style.display !== 'none';
    commentsSection.style.display = isVisible ? 'none' : 'block';
  }
};

/**
 * Submit comment (Global function)
 */
window.submitComment = async function(tafsirId) {
  const input = document.getElementById(`comment-input-${tafsirId}`);
  const content = input.value.trim();
  
  if (!content) {
    showMessage('Komentar tidak boleh kosong', 'warning');
    return;
  }
  
  const username = getSavedUsername() || 'Anonymous';
  
  try {
    await addComment(tafsirId, username, content);
    
    input.value = '';
    showMessage('Komentar ditambahkan! 💬', 'success');
    
    // Reload tafsiran to show new comment
    await loadTafsiran();
    
    // Re-open comments section
    setTimeout(() => {
      const commentsSection = document.getElementById(`comments-${tafsirId}`);
      if (commentsSection) commentsSection.style.display = 'block';
    }, 100);
    
  } catch (error) {
    console.error('Error submitting comment:', error);
    showMessage('Gagal menambahkan komentar', 'error');
  }
};

/**
 * Show loading
 */
function showLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
  }
}

/**
 * Show message toast
 */
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

/**
 * Format date
 */
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

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}