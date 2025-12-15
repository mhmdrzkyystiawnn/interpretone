/**
 * Genius API Functions
 * Note: API calls akan lewat Vercel Serverless Functions untuk protect API token
 */

const API_BASE = '/api'; // Vercel serverless functions endpoint

/**
 * Search songs on Genius
 * @param {string} query - Search query (song title, artist, lyrics)
 * @returns {Promise<Array>} Array of search results
 */
export async function searchSongs(query) {
  if (!query || query.trim() === '') {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE}/genius-search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform Genius API response to our format
    const results = data.response.hits.map(hit => ({
      id: hit.result.id,
      title: hit.result.title,
      artist: hit.result.primary_artist.name,
      artistId: hit.result.primary_artist.id,
      albumArt: hit.result.song_art_image_url || hit.result.header_image_url,
      releaseDate: hit.result.release_date_for_display,
      url: hit.result.url,
      fullTitle: hit.result.full_title
    }));

    return results;
  } catch (error) {
    console.error('❌ Error searching songs:', error);
    throw error;
  }
}

/**
 * Get song details by Genius ID
 * @param {number} geniusId - Genius song ID
 * @returns {Promise<Object|null>} Song object or null
 */
export async function getSongById(geniusId) {
  try {
    const response = await fetch(`${API_BASE}/genius-song?id=${geniusId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch song: ${response.status}`);
    }

    const data = await response.json();
    const song = data.response.song;

    return {
      id: song.id,
      title: song.title,
      artist: song.primary_artist.name,
      artistId: song.primary_artist.id,
      albumArt: song.song_art_image_url || song.header_image_url,
      album: song.album?.name || null,
      releaseDate: song.release_date_for_display,
      url: song.url,
      description: song.description?.plain || null,
      featuredArtists: song.featured_artists?.map(a => a.name) || [],
      producedBy: song.producer_artists?.map(a => a.name) || [],
      writtenBy: song.writer_artists?.map(a => a.name) || []
    };
  } catch (error) {
    console.error('❌ Error fetching song:', error);
    return null;
  }
}

/**
 * Get song lyrics from Lyrics.ovh API
 * @param {string} artist - Artist name
 * @param {string} title - Song title
 * @returns {Promise<string>} Lyrics text
 */
export async function getLyrics(artist, title) {
  try {
    const response = await fetch(
      `${API_BASE}/lyrics-ovh?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
    );
    
    if (!response.ok) {
      console.log('⚠️ Lyrics not found on Lyrics.ovh');
      return 'Lirik tidak tersedia untuk lagu ini.';
    }

    const data = await response.json();
    return data.lyrics || 'Lirik tidak tersedia untuk lagu ini.';
    
  } catch (error) {
    console.error('❌ Error fetching lyrics:', error);
    return 'Lirik tidak tersedia untuk lagu ini.';
  }
}

/**
 * Get full song data (details + lyrics)
 * @param {number} geniusId - Genius song ID
 * @returns {Promise<Object|null>} Complete song object with lyrics
 */
export async function getFullSongData(geniusId) {
  try {
    // Get song details first
    const song = await getSongById(geniusId);
    if (!song) return null;

    // Get lyrics using artist and title
    const lyrics = await getLyrics(song.artist, song.title);

    return {
      ...song,
      lyrics
    };
  } catch (error) {
    console.error('❌ Error fetching full song data:', error);
    return null;
  }
}

/**
 * Format artist name (remove featured artists for cleaner display)
 * @param {string} artistName - Full artist name
 * @returns {string} Cleaned artist name
 */
export function formatArtistName(artistName) {
  return artistName
    .split(' (Ft.')[0]
    .split(' Featuring')[0]
    .split(' feat.')[0]
    .split(' ft.')[0]
    .trim();
}

/**
 * Clean lyrics text (remove extra whitespace)
 * @param {string} lyrics - Raw lyrics text
 * @returns {string} Cleaned lyrics
 */
export function cleanLyrics(lyrics) {
  if (!lyrics || lyrics === 'Lirik tidak tersedia untuk lagu ini.') {
    return lyrics;
  }
  
  return lyrics
    .replace(/\r\n/g, '\n') // Normalize line breaks
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .trim();
}

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 500) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format timestamp to readable date
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'baru saja';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`;
  
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 150) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}