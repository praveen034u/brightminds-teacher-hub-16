// src/api/llmQuestionBank.ts
// Simple API client for LLM-powered question generation (via edge function)
import { getSupabasePublishableKey, getSupabaseUrl } from '@/config/supabase';

export async function generateQuestions({
  auth0UserId,
  subject,
  grade,
  complexity,
  count,
  type
}: {
  auth0UserId: string;
  subject: string;
  grade: string;
  complexity: string;
  count: number;
  type: string;
}): Promise<{ questions: any[]; raw: string }> {
  const url = `${getSupabaseUrl()}/functions/v1/ai-question-bank?auth0_user_id=${encodeURIComponent(auth0UserId)}`;
  const apiKey = getSupabasePublishableKey();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      subject,
      grade,
      complexity,
      count,
      type
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('Failed to generate questions: ' + (errorText || response.statusText));
  }
  const data = await response.json();
  const content = data.raw || '';
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
