/**
 * LocalStorage HANYA untuk preferensi lokal user
 * Data penting (tafsiran, comments, likes) ada di Firebase
 */

const STORAGE_PREFIX = 'interpretone_';

/**
 * Save username preference
 */
export function saveUsername(username) {
  localStorage.setItem(STORAGE_PREFIX + 'username', username);
}

/**
 * Get saved username
 */
export function getSavedUsername() {
  return localStorage.getItem(STORAGE_PREFIX + 'username') || '';
}

/**
 * Save search history (max 20)
 */
export function saveSearchHistory(query) {
  if (!query || query.trim() === '') return;
  
  let history = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'search_history') || '[]');
  
  // Remove if exists
  history = history.filter(q => q !== query);
  
  // Add to beginning
  history.unshift(query);
  
  // Keep only 20
  history = history.slice(0, 20);
  
  localStorage.setItem(STORAGE_PREFIX + 'search_history', JSON.stringify(history));
}

/**
 * Get search history
 */
export function getSearchHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'search_history') || '[]');
}

/**
 * Clear search history
 */
export function clearSearchHistory() {
  localStorage.removeItem(STORAGE_PREFIX + 'search_history');
}

/**
 * Save recently viewed songs (max 10)
 */
export function saveRecentlyViewed(songData) {
  let recent = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'recent_songs') || '[]');
  
  // Remove if exists
  recent = recent.filter(s => s.id !== songData.id);
  
  // Add to beginning
  recent.unshift(songData);
  
  // Keep only 10
  recent = recent.slice(0, 10);
  
  localStorage.setItem(STORAGE_PREFIX + 'recent_songs', JSON.stringify(recent));
}

/**
 * Get recently viewed songs
 */
export function getRecentlyViewed() {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'recent_songs') || '[]');
}