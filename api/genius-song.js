export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Song ID required' });
  }

  try {
    const response = await fetch(
      `https://api.genius.com/songs/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GENIUS_API_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Genius API error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Song fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch song' });
  }
}