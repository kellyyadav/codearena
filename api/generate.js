module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { situation, difficulty, language } = req.body;

  const langNote = language === 'any' 
    ? 'Any programming language' 
    : `Preferred language: ${language}`;

  const prompt = `You are an expert coding question designer for a competitive programming platform.

A user described this real-life situation:
"${situation}"

Difficulty requested: ${difficulty}
${langNote}

Your job:
1. FIRST decide: can this situation be turned into a meaningful, solvable coding question?
   - It must have a clear computational problem
   - It must have defined inputs and outputs
   - It must be solvable with code

2. If YES, respond with ONLY this JSON:
{
  "valid": true,
  "title": "Short descriptive title",
  "difficulty": "${difficulty}",
  "problem": "Full problem statement",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": ["constraint 1", "constraint 2"],
  "hint": "One helpful hint",
  "tags": ["array", "math"]
}

3. If NO, respond with ONLY this JSON:
{
  "valid": false,
  "reason": "Why this cannot become a coding question",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

Respond ONLY with valid JSON. No markdown, no extra text.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.map(c => c.text || '').join('').trim();
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
