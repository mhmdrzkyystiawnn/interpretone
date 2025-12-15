import axios from 'axios';
import * as cheerio from 'cheerio';

// Fungsi untuk mengubah teks jadi format URL (slug)
// Contoh: "Dewa 19" -> "dewa-19", "Hati-Hati di Jalan" -> "hati-hati-di-jalan"
function createSlug(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Hapus karakter aneh (titik, koma, tanda tanya)
    .trim()
    .replace(/\s+/g, '-');        // Ubah spasi jadi strip
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { artist, title } = req.query;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Artist and title required' });
  }

  try {
    // 1. Buat URL langsung (Tanpa Search Engine)
    const artistSlug = createSlug(artist);
    const titleSlug = createSlug(title);
    
    // Pola: https://lirik.kapanlagi.com/artis/dewa-19/aku-milikmu/
    const targetUrl = `https://lirik.kapanlagi.com/artis/${artistSlug}/${titleSlug}/`;

    console.log(`🎯 Direct Hit URL: ${targetUrl}`);

    // 2. Tembak URL tersebut
    // Kita perlu header User-Agent supaya tidak dianggap bot jahat
    const { data: html } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://lirik.kapanlagi.com/'
      },
      timeout: 10000 // Timeout 10 detik
    });

    // 3. Parsing HTML
    const $ = cheerio.load(html);
    let lyrics = '';

    // Coba ambil dari span.lirik_line (Standar KapanLagi)
    const lineElements = $('span.lirik_line');
    
    if (lineElements.length > 0) {
        lineElements.each((i, el) => {
            const text = $(el).text().trim();
            if (text) lyrics += text + '\n';
        });
    } else {
        // Fallback: Ambil text kasar dari container lirik
        // Biasanya ada di div.col-md-12 atau div.lirik_line parent
        // Hapus elemen pengganggu dulu
        $('.baca-juga, .iklan, script, style, .in-read-ad').remove();
        
        // Cari container yang mengandung class lirik atau col-lirik
        const rawText = $('.lirik_line').parent().text();
        if(rawText) lyrics = rawText;
    }

    // 4. Bersihkan Teks
    lyrics = lyrics
        .replace(/KapanLagi\.com/gi, '')
        .replace(/Simak lirik lagu/gi, '')
        .replace(/Lirik Lagu/gi, '')
        .replace(/Oleh/gi, '')
        .trim();

    if (!lyrics || lyrics.length < 50) {
        return res.status(404).json({ error: 'Lirik kosong atau gagal diparsing' });
    }

    console.log('✅ Success getting lyrics!');

    return res.status(200).json({ 
        source: 'KapanLagi (Direct)',
        url: targetUrl,
        lyrics: lyrics
    });

  } catch (error) {
    // Handle 404 (Lagu tidak ditemukan karena slug salah)
    if (error.response && error.response.status === 404) {
        console.log(`❌ URL tidak ditemukan: ${error.config.url}`);
        return res.status(404).json({ 
            error: 'Lagu tidak ditemukan di KapanLagi. Coba perbaiki ejaan artis/judul.' 
        });
    }

    console.error('🔥 Server Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}