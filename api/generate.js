module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const situation = body?.situation || '';
    const difficulty = body?.difficulty || 'easy';
    const language = body?.language || 'any';

    if (!situation.trim()) {
      return res.status(400).json({ error: 'Please describe a situation first!' });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return res.status(500).json({ error: 'API key not configured. Please add GROQ_API_KEY in Vercel environment variables.' });
    }

    const langNote = language === 'any' ? 'Any programming language' : `Preferred language: ${language}`;

    const prompt = `You are a coding question designer. Turn real-life situations into coding problems.

Situation: "${situation}"
Difficulty: ${difficulty}
${langNote}

Can this become a coding problem with clear inputs/outputs and algorithmic solution?

If YES - respond with ONLY this JSON (no markdown, no backticks, nothing else):
{"valid":true,"title":"Short title","difficulty":"${difficulty}","problem":"Full problem statement","examples":[{"input":"example input","output":"example output","explanation":"why"}],"constraints":["1 <= n <= 1000"],"hint":"helpful hint","tags":["math","array"]}

If NO - respond with ONLY this JSON:
{"valid":false,"reason":"why it cannot work","suggestions":["better version 1","better version 2","better version 3"]}

CRITICAL: Return ONLY the JSON object. No other text.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq error:', JSON.stringify(data));
      return res.status(500).json({ 
        error: data.error?.message || `Groq API error: ${response.status}` 
      });
    }

    const text = data?.choices?.[0]?.message?.content || '';
    
    // Clean any markdown formatting
    const clean = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    // Find JSON in response
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in:', clean);
      return res.status(500).json({ error: 'AI response was not valid JSON. Please try again.' });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);

  } catch (err) {
    console.error('Handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
