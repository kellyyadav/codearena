module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { code, language, examples, problem, isSubmit } = body;

    if (!code || !examples || examples.length === 0) {
      return res.status(400).json({ error: 'Missing code or examples' });
    }

    const prompt = `You are a code evaluator. A user wrote code to solve a programming problem.

PROBLEM:
${problem}

USER'S CODE (${language}):
\`\`\`${language}
${code}
\`\`\`

TEST CASES TO EVALUATE:
${examples.map((e, i) => `Test ${i+1}: Input: ${e.input} | Expected Output: ${e.output}`).join('\n')}

Evaluate if the code LOGICALLY solves each test case correctly.
- Read the code carefully
- Trace through it mentally with each input
- Determine if it would produce the expected output

Respond with ONLY this JSON (no markdown, no backticks):
{
  "results": [
    {"id": 1, "input": "...", "expected": "...", "got": "...", "status": "pass or fail"},
    {"id": 2, "input": "...", "expected": "...", "got": "...", "status": "pass or fail"}
  ],
  "console": "any relevant notes about the code"
}

Be strict but fair. If the code has syntax errors or wrong logic, mark as fail.`;

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
        temperature: 0.1
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Groq error' });

    const text = data?.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      return res.status(200).json(parsed);
    } catch (e) {
      return res.status(500).json({ error: 'Parse failed', raw: clean.substring(0, 300) });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
