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

IMPORTANT: Return ONLY raw JSON. No markdown. No backticks. No explanation outside JSON.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API error');
    }

    // Safely extract text
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini');
    }

    // Clean any markdown if Gemini adds it anyway
    const clean = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      // If JSON parse fails, return the raw text for debugging
      return res.status(500).json({ 
        error: 'Could not parse AI response', 
        raw: clean.substring(0, 200) 
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
