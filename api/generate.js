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

2. If YES, respond with ONLY this JSON (no markdown, no backticks):
{
  "valid": true,
  "title": "Short descriptive title",
  "difficulty": "${difficulty}",
  "problem": "Full problem statement with context from the situation",
  "examples": [{"input": "...", "output": "...", "explanation": "..."}],
  "constraints": ["constraint 1", "constraint 2"],
  "hint": "One helpful hint without giving away the solution",
  "tags": ["array", "math"]
}

3. If NO, respond with ONLY this JSON (no markdown, no backticks):
{
  "valid": false,
  "reason": "Clear explanation of why this cannot become a coding question",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

Return ONLY raw JSON. No markdown. No backticks. No explanation outside JSON.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Anthropic API error');
    }

    const text = data?.content?.[0]?.text;

    if (!text) {
      throw new Error('No response from API');
    }

    const clean = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({
        error: 'Could not parse response',
        raw: clean.substring(0, 300)
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
