export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { artist, title } = req.query;

  if (!artist || !title) {
    return res.status(400).json({ error: 'Artist and title required' });
  }

  try {
    const response = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
    );

    if (!response.ok) {
      return res.status(404).json({ error: 'Lyrics not found' });
    }

    const data = await response.json();
    
    if (!data.lyrics) {
      return res.status(404).json({ error: 'Lyrics not available' });
    }
    
    res.status(200).json({ lyrics: data.lyrics });
    
  } catch (error) {
    console.error('Lyrics.ovh error:', error);
    res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
}