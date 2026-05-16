module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const situation = body?.situation;
    const difficulty = body?.difficulty || 'easy';
    const language = body?.language || 'any';

    if (!situation) return res.status(400).json({ error: 'No situation provided' });

    const langNote = language === 'any' ? 'Any programming language' : `Preferred language: ${language}`;

    const prompt = `You are an expert coding question designer.

A user described this real-life situation: "${situation}"
Difficulty: ${difficulty}
${langNote}

Decide: can this become a solvable coding question with clear inputs/outputs?

If YES, return ONLY this JSON:
{"valid":true,"title":"Short title","difficulty":"${difficulty}","problem":"Full problem statement","examples":[{"input":"...","output":"...","explanation":"..."}],"constraints":["constraint 1"],"hint":"One hint","tags":["tag1"]}

If NO, return ONLY this JSON:
{"valid":false,"reason":"Why not","suggestions":["Fix 1","Fix 2","Fix 3"]}

ONLY return raw JSON. No markdown. No backticks.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Groq API error' });
    }

    const text = data?.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch (e) {
      return res.status(500).json({ error: 'Parse failed', raw: clean.substring(0, 200) });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
