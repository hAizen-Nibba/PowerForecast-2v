import { devLog } from "./devLogger";

export interface MeralcoTariffComponent {
  name: string;
  nameTl: string;
  ratePerKwh: number;
  description: string;
  descriptionTl: string;
  category: "generation" | "transmission" | "systemLoss" | "distribution" | "subsidies" | "government" | "universal";
  icon: string;
}

export interface MeralcoTariffData {
  generationRate: number;
  transmission: number;
  systemLoss: number;
  distribution: number;
  supplyAndMetering: number;
  subsidies: number;
  universalAndFitAll: number;
  governmentTaxes: number;
  totalEffectiveRate: number;
  billingPeriod: string;
  billingPeriodTl: string;
  lastSyncedAt: string;
  status: "live" | "cached";
  components: MeralcoTariffComponent[];
  trend?: "up" | "down" | "stable" | null;
  rateChange?: number | null;
  rateChangePercent?: number | null;
  sourceUrl?: string;
}

export interface RateBracketEntry {
  kwh: number;
  rate: number;
  generation_rate: number;
  rate_change: number | null;
  rate_change_percent: number | null;
  trend: "up" | "down" | "stable" | null;
}

export interface RatesPayload {
  success: boolean;
  error?: string | null;
  warning?: string | null;
  date?: string | null;
  data: RateBracketEntry[];
  meta?: {
    timestamp?: string;
    source?: string;
  };
}

const STORAGE_KEY = "powerforecast_meralco_tariff_data_v2";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 12; // 12 hours

// Fallback September 2026 official Meralco rates
export const DEFAULT_MERALCO_TARIFF: MeralcoTariffData = {
  generationRate: 9.7032,
  transmission: 1.2826,
  systemLoss: 0.8898,
  distribution: 1.2908,
  supplyAndMetering: 0.6293,
  subsidies: -1.0162,
  universalAndFitAll: 0.6575,
  governmentTaxes: 1.2954,
  totalEffectiveRate: 14.7424,
  billingPeriod: "September 2026 Scheduled Tariff",
  billingPeriodTl: "Nakatakdang Taripa ng Setyembre 2026",
  lastSyncedAt: new Date().toISOString(),
  status: "live",
  trend: "down",
  rateChange: -0.0409,
  rateChangePercent: -0.28,
  components: [
    {
      name: "Generation Charge (Gen Rate)",
      nameTl: "Halaga ng Paglikha (Gen Rate)",
      ratePerKwh: 9.7032,
      description: "Cost of electricity produced by power generation plants (PSA, IPP, WESM)",
      descriptionTl: "Halaga ng kuryenteng ginawa ng mga planta ng kuryente",
      category: "generation",
      icon: "⚡",
    },
    {
      name: "Transmission Charge",
      nameTl: "Halaga ng Paghahatid (NGCP)",
      ratePerKwh: 1.2826,
      description: "Cost of delivering high-voltage electricity via the National Grid (NGCP & Ancillary)",
      descriptionTl: "Bayad sa paghahatid ng kuryente sa high-voltage grid at ancillary services",
      category: "transmission",
      icon: "🔌",
    },
    {
      name: "System Loss Charge",
      nameTl: "System Loss (Nawalang Kuryente)",
      ratePerKwh: 0.8898,
      description: "ERC-regulated technical & non-technical losses during grid transmission",
      descriptionTl: "Kuryenteng nawala sa linya alinsunod sa limitasyon ng ERC",
      category: "systemLoss",
      icon: "📉",
    },
    {
      name: "Distribution Charge (Wires)",
      nameTl: "Halaga ng Distribusyon (Meralco)",
      ratePerKwh: 1.2908,
      description: "Operating and maintaining the Meralco electric distribution system",
      descriptionTl: "Pagpapanatili ng mga poste at kable ng Meralco",
      category: "distribution",
      icon: "🏢",
    },
    {
      name: "Supply & Metering Charges",
      nameTl: "Pagsukat at Pagseserbisyo",
      ratePerKwh: 0.6293,
      description: "Customer billing, meter reading, and account servicing",
      descriptionTl: "Pagbasa ng metro, pag-isyu ng bill, at serbisyo sa kustomer",
      category: "distribution",
      icon: "🛠️",
    },
    {
      name: "Subsidies & True-Up Refund",
      nameTl: "Mga Subsidiya at Refund",
      ratePerKwh: -1.0162,
      description: "Lifeline subsidy, Senior Citizen discounts, and ERC AWAT refund adjustments",
      descriptionTl: "Subsidiya sa lifeline, senior citizen, at AWAT refund ng ERC",
      category: "subsidies",
      icon: "💚",
    },
    {
      name: "Universal Charge & FIT-All",
      nameTl: "Universal Charge at FIT-All",
      ratePerKwh: 0.6575,
      description: "Missionary electrification, environmental fund, and renewable incentives",
      descriptionTl: "Pondong pang-elektrisidad sa malalayong isla at renewable energy",
      category: "universal",
      icon: "🏛️",
    },
    {
      name: "Government Taxes (VAT & LFT)",
      nameTl: "Buwis ng Pamahalaan (VAT)",
      ratePerKwh: 1.2954,
      description: "Value Added Tax on Generation, Transmission, and Local Franchise Tax",
      descriptionTl: "Value Added Tax at Local Franchise Tax ng gobyerno",
      category: "government",
      icon: "🧾",
    },
  ],
};

function formatPeriodNames(dateStr?: string | null): { en: string; tl: string } {
  if (!dateStr) {
    const now = new Date();
    return {
      en: `${now.toLocaleString("en-US", { month: "long", year: "numeric" })} Scheduled Tariff`,
      tl: `Nakatakdang Taripa ng ${now.toLocaleString("tl-PH", { month: "long", year: "numeric" })}`,
    };
  }

  // Expecting format "MM/YYYY" e.g. "09/2026"
  const [mm, yyyy] = dateStr.split("/");
  const monthNum = parseInt(mm, 10);
  const yearNum = parseInt(yyyy, 10);

  if (monthNum >= 1 && monthNum <= 12 && yearNum > 2000) {
    const dateObj = new Date(yearNum, monthNum - 1, 1);
    const enMonth = dateObj.toLocaleString("en-US", { month: "long" });
    const tlMonths = [
      "Enero", "Pebrero", "Marso", "Abril", "Mayo", "Hunyo",
      "Hulyo", "Agosto", "Setyembre", "Oktubre", "Nobyembre", "Disyembre"
    ];
    const tlMonth = tlMonths[monthNum - 1] || enMonth;

    return {
      en: `${enMonth} ${yearNum} Scheduled Tariff`,
      tl: `Nakatakdang Taripa ng ${tlMonth} ${yearNum}`,
    };
  }

  return {
    en: `${dateStr} Scheduled Tariff`,
    tl: `Nakatakdang Taripa ng ${dateStr}`,
  };
}

/**
 * Builds unbundled component breakdown dynamically from the baseline rate and generation rate
 */
function buildComponents(genRate: number, totalRate: number): MeralcoTariffComponent[] {
  const otherChargesTotal = Math.max(0, totalRate - genRate);
  
  // Standard proportions from official Meralco unbundled rate schedule
  // 1.2826 / 5.0392 ~= 0.2545 Transmission
  // 0.8898 / 5.0392 ~= 0.1766 System Loss
  // 1.2908 / 5.0392 ~= 0.2561 Distribution
  // 0.6293 / 5.0392 ~= 0.1249 Supply & Metering
  // -1.0162 / 5.0392 ~= -0.2016 Subsidies / Refunds
  // 0.6575 / 5.0392 ~= 0.1305 Universal & FIT-All
  // 1.2954 / 5.0392 ~= 0.2570 Taxes
  const transmission = Number((otherChargesTotal * 0.2545).toFixed(4));
  const systemLoss = Number((otherChargesTotal * 0.1766).toFixed(4));
  const distribution = Number((otherChargesTotal * 0.2561).toFixed(4));
  const supplyAndMetering = Number((otherChargesTotal * 0.1249).toFixed(4));
  const subsidies = Number((-Math.abs(otherChargesTotal * 0.2016)).toFixed(4));
  const universal = Number((otherChargesTotal * 0.1305).toFixed(4));
  
  // Ensure components balance to exact totalRate
  const subtotalExceptTax = genRate + transmission + systemLoss + distribution + supplyAndMetering + subsidies + universal;
  const taxes = Number((totalRate - subtotalExceptTax).toFixed(4));

  return [
    {
      name: "Generation Charge (Gen Rate)",
      nameTl: "Halaga ng Paglikha (Gen Rate)",
      ratePerKwh: genRate,
      description: "Cost of electricity produced by power generation plants (PSA, IPP, WESM)",
      descriptionTl: "Halaga ng kuryenteng ginawa ng mga planta ng kuryente",
      category: "generation",
      icon: "⚡",
    },
    {
      name: "Transmission Charge",
      nameTl: "Halaga ng Paghahatid (NGCP)",
      ratePerKwh: transmission,
      description: "Cost of delivering high-voltage electricity via the National Grid (NGCP & Ancillary)",
      descriptionTl: "Bayad sa paghahatid ng kuryente sa high-voltage grid at ancillary services",
      category: "transmission",
      icon: "🔌",
    },
    {
      name: "System Loss Charge",
      nameTl: "System Loss (Nawalang Kuryente)",
      ratePerKwh: systemLoss,
      description: "ERC-regulated technical & non-technical losses during grid transmission",
      descriptionTl: "Kuryenteng nawala sa linya alinsunod sa limitasyon ng ERC",
      category: "systemLoss",
      icon: "📉",
    },
    {
      name: "Distribution Charge (Wires)",
      nameTl: "Halaga ng Distribusyon (Meralco)",
      ratePerKwh: distribution,
      description: "Operating and maintaining the Meralco electric distribution system",
      descriptionTl: "Pagpapanatili ng mga poste at kable ng Meralco",
      category: "distribution",
      icon: "🏢",
    },
    {
      name: "Supply & Metering Charges",
      nameTl: "Pagsukat at Pagseserbisyo",
      ratePerKwh: supplyAndMetering,
      description: "Customer billing, meter reading, and account servicing",
      descriptionTl: "Pagbasa ng metro, pag-isyu ng bill, at serbisyo sa kustomer",
      category: "distribution",
      icon: "🛠️",
    },
    {
      name: "Subsidies & True-Up Refund",
      nameTl: "Mga Subsidiya at Refund",
      ratePerKwh: subsidies,
      description: "Lifeline subsidy, Senior Citizen discounts, and ERC AWAT refund adjustments",
      descriptionTl: "Subsidiya sa lifeline, senior citizen, at AWAT refund ng ERC",
      category: "subsidies",
      icon: "💚",
    },
    {
      name: "Universal Charge & FIT-All",
      nameTl: "Universal Charge at FIT-All",
      ratePerKwh: universal,
      description: "Missionary electrification, environmental fund, and renewable incentives",
      descriptionTl: "Pondong pang-elektrisidad sa malalayong isla at renewable energy",
      category: "universal",
      icon: "🏛️",
    },
    {
      name: "Government Taxes (VAT & LFT)",
      nameTl: "Buwis ng Pamahalaan (VAT)",
      ratePerKwh: taxes,
      description: "Value Added Tax on Generation, Transmission, and Local Franchise Tax",
      descriptionTl: "Value Added Tax at Local Franchise Tax ng gobyerno",
      category: "government",
      icon: "🧾",
    },
  ];
}

/**
 * Fetches the dynamic rates payload from local /rates.json or remote fallback
 */
export async function fetchRatesPayload(forceRefresh: boolean = false): Promise<RatesPayload | null> {
  const endpoints = [
    `/rates.json${forceRefresh ? `?t=${Date.now()}` : ""}`,
    // Remote fallback to raw repository if app is running in custom domains
    "https://raw.githubusercontent.com/RandomUs3rInTh3Int3rn3t/BillShock/main/rates.json",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: forceRefresh ? "no-store" : "default",
      });
      if (res.ok) {
        const json = (await res.json()) as RatesPayload;
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          return json;
        }
      }
    } catch {
      // Continue to next endpoint if failed
    }
  }

  return null;
}

/**
 * Retrieves the current dynamic Meralco tariff.
 * Fetches from /rates.json and caches in localStorage with max-age eviction.
 */
export async function getMeralcoTariff(forceRefresh: boolean = false): Promise<MeralcoTariffData> {
  // Check local cache if not forcing refresh
  if (!forceRefresh) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as MeralcoTariffData;
        const lastSync = new Date(parsed.lastSyncedAt).getTime();
        if (Date.now() - lastSync < CACHE_MAX_AGE_MS) {
          return parsed;
        }
      } catch (e) {
        devLog.warn("MeralcoRateService", "Failed to parse cached tariff data:", e);
      }
    }
  }

  // Attempt dynamic fetch from rates.json
  try {
    const payload = await fetchRatesPayload(forceRefresh);
    if (payload && payload.data && payload.data.length > 0) {
      // Find standard baseline household bracket (200 kWh) or first available
      const baseline = payload.data.find((d) => d.kwh === 200) || payload.data[0];
      const genRate = baseline.generation_rate || DEFAULT_MERALCO_TARIFF.generationRate;
      const totalRate = baseline.rate || DEFAULT_MERALCO_TARIFF.totalEffectiveRate;
      const periods = formatPeriodNames(payload.date);
      const components = buildComponents(genRate, totalRate);

      const liveTariff: MeralcoTariffData = {
        generationRate: genRate,
        transmission: components.find((c) => c.category === "transmission")?.ratePerKwh || 1.2826,
        systemLoss: components.find((c) => c.category === "systemLoss")?.ratePerKwh || 0.8898,
        distribution: components.find((c) => c.category === "distribution")?.ratePerKwh || 1.2908,
        supplyAndMetering: components.find((c) => c.name.includes("Supply"))?.ratePerKwh || 0.6293,
        subsidies: components.find((c) => c.category === "subsidies")?.ratePerKwh || -1.0162,
        universalAndFitAll: components.find((c) => c.category === "universal")?.ratePerKwh || 0.6575,
        governmentTaxes: components.find((c) => c.category === "government")?.ratePerKwh || 1.2954,
        totalEffectiveRate: totalRate,
        billingPeriod: `${periods.en} (ERC Unbundled)`,
        billingPeriodTl: `${periods.tl} (ERC Unbundled)`,
        lastSyncedAt: new Date().toISOString(),
        status: "live",
        trend: baseline.trend || "down",
        rateChange: baseline.rate_change,
        rateChangePercent: baseline.rate_change_percent,
        sourceUrl: payload.meta?.source,
        components,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(liveTariff));
      } catch (e) {
        devLog.warn("MeralcoRateService", "Failed to cache tariff data:", e);
      }

      return liveTariff;
    }
  } catch (err) {
    devLog.warn("MeralcoRateService", "Dynamic tariff fetch failed, falling back to default:", err);
  }

  // Fallback to default
  return {
    ...DEFAULT_MERALCO_TARIFF,
    lastSyncedAt: new Date().toISOString(),
    status: "cached",
  };
}

/**
 * Get dynamic rate for a specific kWh consumption bracket (e.g. 50, 100, 200, 300, 500 kWh)
 */
export async function getMeralcoRateForKwh(kwh: number): Promise<RateBracketEntry | null> {
  const payload = await fetchRatesPayload();
  if (!payload || !payload.data) return null;

  // Find exact bracket or nearest bracket
  const exact = payload.data.find((d) => d.kwh === kwh);
  if (exact) return exact;

  // Find closest bracket
  return payload.data.reduce((prev, curr) => {
    return Math.abs(curr.kwh - kwh) < Math.abs(prev.kwh - kwh) ? curr : prev;
  }, payload.data[0]);
}

/**
 * Returns all consumption bracket rate entries
 */
export async function getAllMeralcoBrackets(): Promise<RateBracketEntry[]> {
  const payload = await fetchRatesPayload();
  return payload?.data || [];
}
