import { staticAiRows } from '../context/AppContext.jsx';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function callGemini(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');

  const res = await fetch(`${API_BASE}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip markdown code fences if present
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Returns an array of 6 keyword strings for searching freelancers.
 * Falls back to an empty array on error.
 */
export async function getKeywordSuggestions(jobDescription) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return [];

  try {
    const prompt = `Based on this job description, suggest 6 Thai/English search keywords for finding freelancers on Fastwork marketplace. Return JSON array of strings only.\n\nJob description: ${jobDescription}`;
    const result = await callGemini(prompt);
    if (Array.isArray(result)) return result.slice(0, 6);
    return [];
  } catch (e) {
    console.warn('getKeywordSuggestions failed:', e);
    return [];
  }
}

/**
 * Attempts to extract vendor info from a Fastwork profile URL.
 * Returns an object with name, price, rat, rev, res, lang fields,
 * or null if extraction fails / no API key.
 */
export async function extractVendorFromUrl(url) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `A user pasted this Fastwork freelancer profile URL: "${url}"

Based on the URL structure alone (username, path segments), try to infer as much as possible about this freelancer profile and return a JSON object with these fields:
- name: string (freelancer name or username from URL, use the last path segment)
- price: string (estimate like "฿5,000" — use "—" if unknown)
- rat: string (like "4.8 ★" — use "—" if unknown)
- rev: string (like "20 รีวิว" — use "—" if unknown)
- res: string (like "< 24 ชม." — use "—" if unknown)
- lang: string ("ไทย" or "ไทย / อังกฤษ" — use "ไทย" as default)
- score: number (50–90 range estimate, use 70 if unknown)
- winner: boolean (always false)
- fastworkUrl: string (the original URL)

Return JSON only, no explanation.`;

    const result = await callGemini(prompt);
    if (result && typeof result === 'object' && result.name) {
      return {
        name: result.name || 'Vendor',
        price: result.price || '—',
        rat: result.rat || '—',
        rev: result.rev || '—',
        res: result.res || '—',
        lang: result.lang || 'ไทย',
        score: Number(result.score) || 70,
        winner: false,
        b2b: '—',
        portfolio: [{ type: 'fastwork', label: 'Fastwork profile', url }],
      };
    }
    return null;
  } catch (e) {
    console.warn('extractVendorFromUrl failed:', e);
    return null;
  }
}

/**
 * Returns an array of {key, label, ai:true} criteria rows.
 * Falls back to static aiRows on error or missing key.
 */
export async function generateCriteria(jobDescription) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return staticAiRows;

  try {
    const prompt = `Based on this job description, generate 4-6 comparison criteria rows for evaluating freelancers. Return JSON array of {key: string, label: string (Thai)} objects only.\n\nJob description: ${jobDescription}`;
    const result = await callGemini(prompt);
    if (!Array.isArray(result) || result.length === 0) return staticAiRows;

    // Merge with static non-AI rows (price, rat, rev, res, lang) and add score at end
    const staticBase = staticAiRows.filter(r => !r.ai && !r.isScore);
    const aiRows = result.map(r => ({ key: r.key, label: r.label, ai: true }));
    const scoreRow = staticAiRows.find(r => r.isScore);
    return [...staticBase, ...aiRows, scoreRow];
  } catch (e) {
    console.warn('generateCriteria failed:', e);
    return staticAiRows;
  }
}
