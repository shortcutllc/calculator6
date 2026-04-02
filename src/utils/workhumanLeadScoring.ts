import { LeadTier, WorkhumanLeadCSVRow } from '../types/workhumanLead';

// --- Title Scoring (0-40) ---

const TITLE_PATTERNS: [RegExp, number][] = [
  // C-suite and VP level (40)
  [/\b(chief|chro|cpo|ceo|cfo|coo|cto|cmo|cdo|cio)\b/i, 40],
  [/\bc[\s-]?suite\b/i, 40],
  [/\b(svp|evp)\b/i, 40],
  [/\bvice[\s-]?president\b/i, 40],
  [/\bvp\b/i, 40],
  // Director and Head (30)
  [/\bdirector\b/i, 30],
  [/\bhead\s+of\b/i, 30],
  // Senior Manager (20) — must match before Manager
  [/\bsenior[\s-]?manager\b/i, 20],
  [/\bsr\.?\s*manager\b/i, 20],
  // Manager (15)
  [/\bmanager\b/i, 15],
  // Coordinator / Specialist / Analyst (5)
  [/\b(coordinator|specialist|analyst|associate|assistant)\b/i, 5],
];

export function scoreTitle(title: string | null | undefined): number {
  if (!title) return 0;
  for (const [pattern, score] of TITLE_PATTERNS) {
    if (pattern.test(title)) return score;
  }
  return 0;
}

// --- Company Size Scoring (0-30) ---

export function normalizeCompanySize(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.trim().toLowerCase();

  // Handle "K" suffix: "5K", "10k+"
  const kMatch = cleaned.match(/^([\d,.]+)\s*k\+?$/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1].replace(/,/g, '')) * 1000);
  }

  // Handle ranges: "2000-4999", "2,000 - 4,999"
  const rangeMatch = cleaned.match(/([\d,]+)\s*[-–]\s*([\d,]+)/);
  if (rangeMatch) {
    const low = parseInt(rangeMatch[1].replace(/,/g, ''), 10);
    const high = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
    return Math.round((low + high) / 2);
  }

  // Handle "5,000+" or "5000+"
  const plusMatch = cleaned.match(/([\d,]+)\+/);
  if (plusMatch) {
    return parseInt(plusMatch[1].replace(/,/g, ''), 10);
  }

  // Handle plain numbers possibly with "employees" suffix: "500 employees", "1,200"
  const numMatch = cleaned.match(/([\d,]+)/);
  if (numMatch) {
    return parseInt(numMatch[1].replace(/,/g, ''), 10);
  }

  return 0;
}

export function scoreCompanySize(normalized: number): number {
  if (normalized >= 5000) return 30;
  if (normalized >= 2000) return 25;
  if (normalized >= 500) return 20;
  if (normalized >= 200) return 10;
  if (normalized > 0) return 5;
  return 0;
}

// --- Industry Scoring (0-20) ---

const INDUSTRY_TIERS: [RegExp, number][] = [
  // Tier 1: 20 points — use prefix matching (no trailing \b) for stems like "tech", "financ"
  [/\b(tech|software|saas|fintech|biotech|information technology|digital)/i, 20],
  [/\b(financ|banking|insurance|investment|capital|wealth|asset)/i, 20],
  [/\b(health\s*care|medical|pharma|biomedical|hospital|clinical)/i, 20],
  [/\b(professional services|consulting|legal|law\s+firm|accounting|advisory)/i, 20],
  // Tier 2: 15 points
  [/\b(manufactur|industrial|automotive|aerospace|defense|energy|oil|gas)/i, 15],
  [/\b(retail|consumer|ecommerce|e-commerce|hospitality|food|beverage)/i, 15],
  [/\b(media|entertainment|telecom|communication)/i, 15],
  [/\b(real\s*estate|construction|property)/i, 15],
  // Tier 3: 10 points
  [/\b(education|university|school|academic)/i, 10],
  [/\b(government|public\s*sector|federal|state|municipal)/i, 10],
  [/\b(non[\s-]*profit|ngo|foundation|charity)/i, 10],
];

export function scoreIndustry(industry: string | null | undefined): number {
  if (!industry) return 5;
  for (const [pattern, score] of INDUSTRY_TIERS) {
    if (pattern.test(industry)) return score;
  }
  return 5; // Unknown industry gets base 5
}

// --- Multi-Office Scoring (0-10) ---

export function parseMultiOffice(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^(yes|y|true|1|multiple)$/i.test(value.trim());
}

export function scoreMultiOffice(multiOffice: boolean): number {
  return multiOffice ? 10 : 0;
}

// --- Composite Scoring ---

export interface LeadScoreResult {
  score: number;
  tier: LeadTier;
  companySizeNormalized: number;
  multiOffice: boolean;
}

export function calculateWorkhumanLeadScore(row: WorkhumanLeadCSVRow): LeadScoreResult {
  const companySizeNormalized = normalizeCompanySize(row.companySize);
  const multiOffice = parseMultiOffice(row.multiOffice);

  const titleScore = scoreTitle(row.title);
  const sizeScore = scoreCompanySize(companySizeNormalized);
  const industryScore = scoreIndustry(row.industry);
  const officeScore = scoreMultiOffice(multiOffice);

  const score = Math.min(100, titleScore + sizeScore + industryScore + officeScore);

  let tier: LeadTier = 'tier_3';
  if (score >= 70) tier = 'tier_1';
  else if (score >= 40) tier = 'tier_2';

  return { score, tier, companySizeNormalized, multiOffice };
}
