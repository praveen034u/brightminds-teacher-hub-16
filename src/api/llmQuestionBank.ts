// src/api/llmQuestionBank.ts
// Simple API client for LLM-powered question generation (OpenAI)

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function generateQuestions({
  apiKey,
  subject,
  grade,
  complexity,
  count,
  type
}: {
  apiKey: string;
  subject: string;
  grade: string;
  complexity: string;
  count: number;
  type: string;
}): Promise<{ questions: any[]; raw: string }> {
  const prompt = `Generate ${count} ${subject} questions for grade ${grade} students. Complexity: ${complexity}. Type: ${type}. Provide options and correct answer. Format as JSON array with fields: text, options, answer.`;
  // Debug: log the URL and request details
  console.log('[LLM] Fetching:', OPENAI_API_URL);
  console.log('[LLM] Request body:', {
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  if (!response.ok) {
    throw new Error('Failed to generate questions: ' + response.statusText);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  let questions: any[] = [];
  try {
    // Try to extract JSON array from the response
    const match = content.match(/\[.*\]/s);
    if (match) {
      questions = JSON.parse(match[0]);
    }
  } catch (e) {
    // fallback: return raw content
  }
  return { questions, raw: content };
}
