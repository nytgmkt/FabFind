import { staticAiRows } from '../context/AppContext.jsx';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const API_BASE_25 = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
 * Reads a Fastwork profile URL using Gemini 2.5 Flash with urlContext.
 * Returns a normalised vendor object, or null on failure.
 */
export async function extractVendorFromUrl(url) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`${API_BASE_25}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tools: [{ urlContext: {} }],
        contents: [{
          parts: [{
            text: `Please visit this Fastwork freelancer profile and extract the vendor information: ${url}

Extract and return the following fields from the actual page content:
- vendor_name: the freelancer's display name or shop name
- rating: numeric rating (e.g. 4.8), 0 if not shown
- jobs_done: number of completed jobs/reviews, 0 if not shown
- price_min: minimum price as a number (THB), 0 if not shown
- price_max: maximum price as a number (THB), 0 if not shown
- price_unit: pricing unit such as "ชิ้น", "เดือน", "โปรเจกต์"
- services: array of service names offered (up to 5)
- response_time: response time string e.g. "ภายใน 1 ชั่วโมง"
- languages: array of languages the freelancer works in`,
          }],
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              vendor_name:   { type: 'STRING' },
              rating:        { type: 'NUMBER' },
              jobs_done:     { type: 'NUMBER' },
              price_min:     { type: 'NUMBER' },
              price_max:     { type: 'NUMBER' },
              price_unit:    { type: 'STRING' },
              services:      { type: 'ARRAY', items: { type: 'STRING' } },
              response_time: { type: 'STRING' },
              languages:     { type: 'ARRAY', items: { type: 'STRING' } },
            },
            required: ['vendor_name'],
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini 2.5 API error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (!v?.vendor_name) return null;

    const priceStr = v.price_min > 0
      ? `฿${Number(v.price_min).toLocaleString()}${v.price_max > v.price_min ? `–฿${Number(v.price_max).toLocaleString()}` : ''}`
      : '—';

    const ratStr = v.rating > 0 ? `${v.rating} ★` : '—';
    const revStr = v.jobs_done > 0 ? `${v.jobs_done} รีวิว` : '—';
    const langStr = v.languages?.length > 0 ? v.languages.join(' / ') : 'ไทย';

    const score = Math.min(95, 60
      + (v.rating > 0 ? Math.round((v.rating / 5) * 20) : 0)
      + (v.jobs_done > 10 ? 10 : v.jobs_done > 0 ? 5 : 0)
      + (v.price_min > 0 ? 5 : 0));

    return {
      name: v.vendor_name,
      price: priceStr,
      rat: ratStr,
      rev: revStr,
      res: v.response_time || '—',
      lang: langStr,
      b2b: '—',
      score,
      winner: false,
      services: v.services || [],
      portfolio: [{ type: 'fastwork', label: 'Fastwork profile', url }],
    };
  } catch (e) {
    console.warn('extractVendorFromUrl (urlContext) failed:', e);
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

    const staticBase = staticAiRows.filter(r => !r.ai && !r.isScore);
    const aiRows = result.map(r => ({ key: r.key, label: r.label, ai: true }));
    const scoreRow = staticAiRows.find(r => r.isScore);
    return [...staticBase, ...aiRows, scoreRow];
  } catch (e) {
    console.warn('generateCriteria failed:', e);
    return staticAiRows;
  }
}
