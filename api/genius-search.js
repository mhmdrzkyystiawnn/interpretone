export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const tokenExists = !!process.env.GENIUS_API_TOKEN;
  const tokenLength = process.env.GENIUS_API_TOKEN?.length || 0;
  
  console.log('🔑 Token loaded?', tokenExists);
  console.log('🔑 Token length:', tokenLength);
  
  if (!tokenExists) {
    return res.status(500).json({ 
      error: 'GENIUS_API_TOKEN not found in environment',
      hint: 'Check .env.local file and restart vercel dev'
    });
  }
  
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter required' });
  }

  try {
    const response = await fetch(
      `https://api.genius.com/search?q=${encodeURIComponent(q)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GENIUS_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Genius API error:', response.status, errorText);
      throw new Error(`Genius API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Search successful, found:', data.response.hits.length, 'results');
    res.status(200).json(data);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Failed to search songs',
      message: error.message 
    });
  }
}