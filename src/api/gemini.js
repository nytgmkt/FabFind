import { GoogleGenAI } from '@google/genai';
import { staticAiRows } from '../context/AppContext.jsx';

function getClient() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set');
  return new GoogleGenAI({ apiKey });
}

// ── URL type detection ──────────────────────────────────────────────────────
export function detectUrlType(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const ext = u.pathname.split('.').pop().toLowerCase();

    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
    if (host.includes('fastwork.co')) return 'fastwork';
    if (host.includes('linkedin.com') && u.pathname.includes('/in/')) return 'linkedin';
    if (host.includes('jobsdb.com') || host.includes('jobtopgun.com')) return 'jobsdb';
    return 'generic';
  } catch {
    return 'generic';
  }
}

export function loadingMessageFor(type) {
  if (type === 'pdf') return 'กำลังอ่าน Resume PDF...';
  if (type === 'image') return 'กำลังวิเคราะห์รูปภาพ...';
  return 'กำลังอ่านข้อมูลจากเว็บ...';
}

// ── Prompt builders per source type ────────────────────────────────────────
function buildExtractionPrompt(url, type, channelType) {
  const channelHint = channelType
    ? `\n\nThis vendor/talent is being evaluated for a "${channelType}" role. Focus on the most relevant information for this type of work.`
    : '';

  const baseInstruction = `Return ONLY a raw JSON object (no markdown, no code fences, no explanation) with exactly these fields:
{
  "vendor_name": "display name",
  "role_type": "freelancer|applicant|agency",
  "rating": 4.8,
  "jobs_done": 42,
  "price_min": 5000,
  "price_max": 8000,
  "price_unit": "เดือน",
  "services": ["service 1", "service 2"],
  "response_time": "ภายใน 24 ชั่วโมง",
  "languages": ["ไทย"],
  "headline": "",
  "skills": [],
  "experience_years": 0,
  "salary_expected": "",
  "availability": "",
  "team_size": 0
}
Use 0 for unknown numbers, "" for unknown strings, [] for unknown arrays.`;

  const prompts = {
    fastwork: `Please visit this Fastwork freelancer profile and extract vendor information: ${url}${channelHint}\n\n${baseInstruction}`,
    linkedin: `Please visit this LinkedIn profile and extract the person's professional information: ${url}${channelHint}\n\nFocus on: name, headline/title, skills, years of experience, languages spoken.\n\n${baseInstruction}`,
    jobsdb: `Please visit this job listing or applicant profile and extract information: ${url}${channelHint}\n\nFocus on: name/agency, services offered, salary range, experience required, languages.\n\n${baseInstruction}`,
    pdf: `Please read this PDF document (resume or portfolio) and extract the person's or agency's information: ${url}${channelHint}\n\nFocus on: name, skills, experience, expected salary, languages, available services.\n\n${baseInstruction}`,
    generic: `Please visit this URL and extract vendor or talent information: ${url}${channelHint}\n\nExtract: name, description, services, price/rate, contact info, languages.\n\n${baseInstruction}`,
  };
  return prompts[type] || prompts.generic;
}

// ── Fetch image URL as base64 ───────────────────────────────────────────────
async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve({
      data: reader.result.split(',')[1],
      mimeType: blob.type || 'image/jpeg',
    });
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Parse JSON from Gemini text (brace-counting with retry) ────────────────
function parseJsonFromText(text) {
  // Try each { in the text until one yields valid JSON
  let searchFrom = 0;
  while (true) {
    const start = text.indexOf('{', searchFrom);
    if (start === -1) break;
    let depth = 0, end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end !== -1) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch { /* try next */ }
    }
    searchFrom = start + 1;
  }
  // Fallback: extract ```json ... ``` block
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1].trim()); } catch { /* give up */ }
  }
  return null;
}

// ── Normalise raw Gemini result into vendor object ─────────────────────────
function normaliseVendor(v, url, type) {
  if (!v?.vendor_name) return null;

  const priceStr = v.price_min > 0
    ? `฿${Number(v.price_min).toLocaleString()}${v.price_max > v.price_min ? `–฿${Number(v.price_max).toLocaleString()}` : ''}`
    : v.salary_expected || '—';

  const score = Math.min(95, 60
    + (v.rating > 0 ? Math.round((v.rating / 5) * 20) : 0)
    + (v.jobs_done > 10 ? 10 : v.jobs_done > 0 ? 5 : 0)
    + (v.price_min > 0 ? 5 : 0));

  return {
    name: v.vendor_name,
    role_type: v.role_type || 'freelancer',
    price: priceStr,
    rat: v.rating > 0 ? `${v.rating} ★` : '—',
    rev: v.jobs_done > 0 ? `${v.jobs_done} รีวิว` : '—',
    res: v.response_time || '—',
    lang: v.languages?.length > 0 ? v.languages.join(' / ') : 'ไทย',
    b2b: '—',
    score,
    winner: false,
    services: v.services || [],
    skills: v.skills || [],
    headline: v.headline || '',
    experience_years: v.experience_years || 0,
    salary_expected: v.salary_expected || '',
    availability: v.availability || '',
    team_size: v.team_size || 0,
    source_type: type,
    source_url: url,
    criteriaEvals: [],
    portfolio: [{ type: type === 'fastwork' ? 'fastwork' : 'upload', label: `${type} profile`, url }],
  };
}

// ── Main extraction dispatcher ─────────────────────────────────────────────
export async function extractVendorFromUrl(url, channelType = '') {
  try {
    const ai = getClient();
    const type = detectUrlType(url);

    // Image: use vision (inline base64)
    if (type === 'image') {
      const { data, mimeType } = await fetchImageAsBase64(url);
      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          parts: [
            { text: buildExtractionPrompt(url, 'image', channelType) },
            { inlineData: { mimeType, data } },
          ],
        }],
      });
      const raw = res.candidates?.[0]?.content?.parts?.find(p => p.text)?.text ?? '';
      const v = parseJsonFromText(raw);
      return normaliseVendor(v, url, 'image');
    }

    // All URL-based types: use urlContext
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: buildExtractionPrompt(url, type, channelType) }] }],
      config: { tools: [{ urlContext: {} }] },
    });

    const candidate = res.candidates?.[0];
    console.log('[extractVendorFromUrl] candidate:', JSON.stringify(candidate, null, 2));
    const raw = candidate?.content?.parts?.find(p => p.text)?.text ?? '';
    console.log('[extractVendorFromUrl] text:', raw);

    const v = parseJsonFromText(raw);
    console.log('[extractVendorFromUrl] parsed:', v);
    return normaliseVendor(v, url, type);
  } catch (e) {
    console.error('[extractVendorFromUrl] FAILED:', e?.message ?? e);
    return null;
  }
}

// ── Evaluate a vendor against channel criteria ─────────────────────────────
export async function evaluateVendorAgainstCriteria(vendor, criteria, channelType = '') {
  try {
    const ai = getClient();
    const criteriaList = criteria.map(c => c.label).join(', ');
    const vendorSummary = [
      `Name: ${vendor.name}`,
      vendor.price !== '—' ? `Price: ${vendor.price}` : '',
      vendor.rat !== '—' ? `Rating: ${vendor.rat}` : '',
      vendor.services?.length ? `Services: ${vendor.services.join(', ')}` : '',
      vendor.skills?.length ? `Skills: ${vendor.skills.join(', ')}` : '',
      vendor.headline ? `Headline: ${vendor.headline}` : '',
      vendor.experience_years ? `Experience: ${vendor.experience_years} years` : '',
      vendor.lang !== '—' ? `Languages: ${vendor.lang}` : '',
      vendor.res !== '—' ? `Response time: ${vendor.res}` : '',
    ].filter(Boolean).join('\n');

    const prompt = `You are evaluating a vendor/talent for a "${channelType || 'general'}" project.

Vendor info:
${vendorSummary}

Evaluate this vendor against these criteria: ${criteriaList}

Return ONLY a raw JSON array (no markdown, no explanation):
[
  { "criterion": "criterion name", "value": "what this vendor offers (short)", "score": 2 },
  ...
]

Score guide: 0=unknown/not applicable, 1=weak, 2=adequate, 3=strong.
One entry per criterion in the same order as given.`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
    });
    const raw = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    // find the array
    const arrStart = cleaned.indexOf('[');
    if (arrStart === -1) return [];
    const result = JSON.parse(cleaned.slice(arrStart));
    return Array.isArray(result) ? result : [];
  } catch (e) {
    console.warn('evaluateVendorAgainstCriteria failed:', e?.message ?? e);
    return [];
  }
}

// ── AI keyword suggestions ─────────────────────────────────────────────────
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

// ── Analyze job for channel setup ─────────────────────────────────────────
export async function analyzeJobForChannel(jobDescription, budgetMin = 0, budgetMax = 0) {
  try {
    const ai = getClient();
    const prompt = `Analyze this job description and return a JSON object for setting up a vendor/talent sourcing channel.

Job description: "${jobDescription}"
Budget: ${budgetMin > 0 ? `฿${budgetMin}–฿${budgetMax}/month` : 'not specified'}

Return ONLY a raw JSON object (no markdown) with exactly these fields:
{
  "channel_name": "short channel name (Thai or English, max 4 words)",
  "channel_type": "social_media | web_dev | hr_admin | photography | creative | generic",
  "channel_icon": "one emoji representing this channel",
  "journey_stages": [
    { "icon": "emoji", "name": "stage name (Thai)", "desc": "1-sentence description (Thai)" }
  ],
  "suggested_criteria": ["criterion 1", "criterion 2", "..."],
  "teams_needed": 1,
  "complexity": "simple | moderate | complex",
  "summary": "one-sentence summary in Thai"
}

journey_stages should have 3–6 stages appropriate for this job type.
suggested_criteria should have 5–8 evaluation criteria specific to the job.`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
    });
    const raw = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseJsonFromText(raw);
  } catch (e) {
    console.warn('analyzeJobForChannel failed:', e?.message);
    return null;
  }
}

// ── Generate comparison criteria ───────────────────────────────────────────
const CHANNEL_CRITERIA_FALLBACK = {
  social_media:  ['Platform coverage', 'Video / Reel', 'Content Calendar', 'Ads capability', 'Response time', 'ภาษา'],
  web_dev:       ['Tech stack', 'Portfolio sites', 'Timeline', 'Support included', 'Price fit', 'ภาษา'],
  hr_admin:      ['Experience years', 'Salary expectation', 'Tools proficiency', 'Availability', 'ภาษา'],
  photography:   ['Style match', 'Equipment', 'Turnaround time', 'Editing included', 'Price fit', 'ภาษา'],
  generic:       ['Relevant experience', 'Price fit', 'Response time', 'ภาษา', 'Services offered'],
};

export async function generateCriteria(jobDescription, channelType = 'generic') {
  const fallbackLabels = CHANNEL_CRITERIA_FALLBACK[channelType] || CHANNEL_CRITERIA_FALLBACK.generic;
  const fallback = fallbackLabels.map((label, i) => ({ key: `c${i}`, label, ai: false }));

  try {
    const ai = getClient();
    const prompt = `Based on this job description and channel type "${channelType}", generate 5-7 comparison criteria for evaluating vendors/talents.
Return JSON array of {key: string (snake_case), label: string (Thai or English, short)} objects only.

Job description: ${jobDescription}`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }],
    });
    const raw = res.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const result = JSON.parse(cleaned);
    if (!Array.isArray(result) || result.length === 0) return fallback;
    return result.map(r => ({ key: r.key, label: r.label, ai: true }));
  } catch (e) {
    console.warn('generateCriteria failed:', e?.message ?? e);
    return fallback;
  }
}
