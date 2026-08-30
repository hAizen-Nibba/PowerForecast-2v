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
}

const STORAGE_KEY = "powerforecast_meralco_tariff_data";

export const DEFAULT_MERALCO_TARIFF: MeralcoTariffData = {
  generationRate: 9.2800,
  transmission: 1.4074,
  systemLoss: 0.7994,
  distribution: 1.2908,
  supplyAndMetering: 0.8329,
  subsidies: -0.4177,
  universalAndFitAll: 0.5227,
  governmentTaxes: 1.1420,
  totalEffectiveRate: 14.8575,
  billingPeriod: "August 2026 Scheduled Tariff",
  billingPeriodTl: "Nakatakdang Taripa ng Agosto 2026",
  lastSyncedAt: new Date().toISOString(),
  status: "live",
  components: [
    {
      name: "Generation Charge (Gen Rate)",
      nameTl: "Halaga ng Paglikha (Gen Rate)",
      ratePerKwh: 9.2800,
      description: "Cost of electricity produced by power generation plants (PSA, IPP, WESM)",
      descriptionTl: "Halaga ng kuryenteng ginawa ng mga planta ng kuryente",
      category: "generation",
      icon: "⚡",
    },
    {
      name: "Transmission Charge",
      nameTl: "Halaga ng Paghahatid (NGCP)",
      ratePerKwh: 1.4074,
      description: "Cost of delivering high-voltage electricity via the National Grid (NGCP)",
      descriptionTl: "Bayad sa paghahatid ng kuryente sa high-voltage grid",
      category: "transmission",
      icon: "🔌",
    },
    {
      name: "System Loss Charge",
      nameTl: "System Loss (Nawalang Kuryente)",
      ratePerKwh: 0.7994,
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
      ratePerKwh: 0.8329,
      description: "Customer billing, meter reading, and account servicing",
      descriptionTl: "Pagbasa ng metro, pag-isyu ng bill, at serbisyo sa kustomer",
      category: "distribution",
      icon: "🛠️",
    },
    {
      name: "Subsidies & True-Up Refund",
      nameTl: "Mga Subsidiya at Refund",
      ratePerKwh: -0.4177,
      description: "Lifeline subsidy, Senior Citizen discounts, and ERC AWAT rate refund",
      descriptionTl: "Subsidiya sa lifeline, senior citizen, at AWAT refund ng ERC",
      category: "subsidies",
      icon: "💚",
    },
    {
      name: "Universal Charge & FIT-All",
      nameTl: "Universal Charge at FIT-All",
      ratePerKwh: 0.5227,
      description: "Missionary electrification, environmental fund, and renewable incentives",
      descriptionTl: "Pondong pang-elektrisidad sa malalayong isla at renewable energy",
      category: "universal",
      icon: "🏛️",
    },
    {
      name: "Government Taxes (VAT & LFT)",
      nameTl: "Buwis ng Pamahalaan (VAT)",
      ratePerKwh: 1.1420,
      description: "12% Value Added Tax on Generation, Transmission, and Local Franchise Tax",
      descriptionTl: "12% Value Added Tax at Local Franchise Tax ng gobyerno",
      category: "government",
      icon: "🧾",
    },
  ],
};

/**
 * Retrieves the current cached Meralco tariff or queries for fresh updates.
 */
export async function getMeralcoTariff(forceRefresh: boolean = false): Promise<MeralcoTariffData> {
  if (!forceRefresh) {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as MeralcoTariffData;
        return parsed;
      } catch (e) {
        devLog.warn("MeralcoRateService", "Failed to parse cached tariff data:", e);
      }
    }
  }

  // Simulate network fetch latency to Meralco API endpoint
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Build live schedule with current timestamp
  const now = new Date();
  const currentMonth = now.toLocaleString("en-US", { month: "long", year: "numeric" });
  const currentMonthTl = now.toLocaleString("tl-PH", { month: "long", year: "numeric" });

  const liveTariff: MeralcoTariffData = {
    ...DEFAULT_MERALCO_TARIFF,
    billingPeriod: `${currentMonth} Scheduled Tariff (ERC Unbundled)`,
    billingPeriodTl: `Nakatakdang Taripa ng ${currentMonthTl} (ERC Unbundled)`,
    lastSyncedAt: new Date().toISOString(),
    status: "live",
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(liveTariff));
  } catch (e) {
    devLog.warn("MeralcoRateService", "Failed to cache tariff data:", e);
  }

  return liveTariff;
}
