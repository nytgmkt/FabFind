import { GoogleGenAI } from '@google/genai';
import { staticAiRows } from '../context/AppContext.jsx';

function getClient() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');
  return new GoogleGenAI({ apiKey });
}

/**
 * Returns an array of 6 keyword strings for searching freelancers.
 * Falls back to an empty array on error.
 */
export async function getKeywordSuggestions(jobDescription) {
  try {
    const ai = getClient();
    const prompt = `Based on this job description, suggest 6 Thai/English search keywords for finding freelancers on Fastwork marketplace. Return JSON array of strings only.\n\nJob description: ${jobDescription}`;
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
    });
    const raw = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const result = JSON.parse(cleaned);
    if (Array.isArray(result)) return result.slice(0, 6);
    return [];
  } catch (e) {
    console.warn('getKeywordSuggestions failed:', e?.message ?? e);
    return [];
  }
}

/**
 * Reads a Fastwork profile URL using Gemini 2.5 Flash with urlContext grounding.
 * Returns a normalised vendor object, or null on failure.
 */
export async function extractVendorFromUrl(url) {
  try {
    const ai = getClient();

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        parts: [{
          text: `Please visit this Fastwork freelancer profile URL and extract vendor information: ${url}

Return ONLY a raw JSON object (no markdown, no code fences) with exactly these fields:
{
  "vendor_name": "display name or shop name",
  "rating": 4.8,
  "jobs_done": 42,
  "price_min": 5000,
  "price_max": 8000,
  "price_unit": "เดือน",
  "services": ["service 1", "service 2"],
  "response_time": "ภายใน 24 ชั่วโมง",
  "languages": ["ไทย", "อังกฤษ"]
}

Use 0 for unknown numbers, empty array for unknown lists, empty string for unknown strings.`,
        }],
      }],
      config: {
        tools: [{ urlContext: {} }],
      },
    });

    const candidate = res.candidates?.[0];
    console.log('[extractVendorFromUrl] candidate:', JSON.stringify(candidate, null, 2));

    // When urlContext is active some parts are toolResult — find the text part
    const parts = candidate?.content?.parts ?? [];
    const raw = parts.find(p => p.text)?.text ?? '';
    console.log('[extractVendorFromUrl] text part:', raw);

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) { console.error('[extractVendorFromUrl] no JSON object found in response'); return null; }
    const v = JSON.parse(match[0]);
    console.log('[extractVendorFromUrl] parsed:', v);

    if (!v?.vendor_name) return null;

    const priceStr = v.price_min > 0
      ? `฿${Number(v.price_min).toLocaleString()}${v.price_max > v.price_min ? `–฿${Number(v.price_max).toLocaleString()}` : ''}`
      : '—';

    const score = Math.min(95, 60
      + (v.rating > 0 ? Math.round((v.rating / 5) * 20) : 0)
      + (v.jobs_done > 10 ? 10 : v.jobs_done > 0 ? 5 : 0)
      + (v.price_min > 0 ? 5 : 0));

    return {
      name: v.vendor_name,
      price: priceStr,
      rat: v.rating > 0 ? `${v.rating} ★` : '—',
      rev: v.jobs_done > 0 ? `${v.jobs_done} รีวิว` : '—',
      res: v.response_time || '—',
      lang: v.languages?.length > 0 ? v.languages.join(' / ') : 'ไทย',
      b2b: '—',
      score,
      winner: false,
      services: v.services || [],
      portfolio: [{ type: 'fastwork', label: 'Fastwork profile', url }],
    };
  } catch (e) {
    console.error('[extractVendorFromUrl] FAILED:', e?.message ?? e);
    console.error('[extractVendorFromUrl] stack:', e?.stack);
    return null;
  }
}

/**
 * Returns an array of {key, label, ai:true} criteria rows.
 * Falls back to static aiRows on error or missing key.
 */
export async function generateCriteria(jobDescription) {
  try {
    const ai = getClient();
    const prompt = `Based on this job description, generate 4-6 comparison criteria rows for evaluating freelancers. Return JSON array of {key: string, label: string (Thai)} objects only.\n\nJob description: ${jobDescription}`;
    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
    });
    const raw = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const result = JSON.parse(cleaned);
    if (!Array.isArray(result) || result.length === 0) return staticAiRows;

    const staticBase = staticAiRows.filter(r => !r.ai && !r.isScore);
    const aiRows = result.map(r => ({ key: r.key, label: r.label, ai: true }));
    const scoreRow = staticAiRows.find(r => r.isScore);
    return [...staticBase, ...aiRows, scoreRow];
  } catch (e) {
    console.warn('generateCriteria failed:', e?.message ?? e);
    return staticAiRows;
  }
}
