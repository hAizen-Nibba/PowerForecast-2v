export interface ApplianceList {
  id: string;
  user_id: string;
  name: string;
  tariff_type: 'residential' | 'commercial';
  is_default: boolean;
  created_at?: string;
}

export interface UserAppliance {
  id: string;
  user_id: string;
  list_id?: string | null;
  tariff_type?: 'residential' | 'commercial';
  name: string;
  category: string;
  brand?: string;
  model?: string;
  control_no?: string;
  source?: 'manual_entry' | 'pelp_db' | 'ai_vision' | 'catalog';
  watts: number;
  voltage?: number;
  quantity: number;
  hours_per_day: number;
  days_per_month: number;
  monthly_kwh: number;
  estimated_cost?: number;
  energy_rating?: string;
  room_location?: string;
  start_hour?: number;
  is_active: boolean;
  is_currently_on?: boolean;
  last_turned_on_at?: string | null;
  ai_metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface ApplianceUsageLog {
  id: string;
  user_id: string;
  appliance_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_minutes?: number;
  kwh_consumed?: number;
  is_peak_window?: boolean;
  estimated_cost?: number;
  source?: string;
  notes?: string;
  created_at?: string;
}

export interface UserCalendarEvent {
  id: string;
  user_id: string;
  appliance_id?: string | null;
  title: string;
  category: 'appliance' | 'billing' | 'peak' | 'audit';
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  hour: number;
  duration_hours: number;
  is_recurring: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeralcoRateTier {
  kwh: number;
  rate: number;
  generation_rate: number;
  rate_change: number;
  rate_change_percent: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface BillBreakdown {
  kwh: number;
  tariffType?: 'residential' | 'commercial';
  generationRate: number;
  otherCharges: number;
  isSeniorCitizen?: boolean;
  
  // Generation & Transmission
  generationTotal: number;
  transmissionTotal: number;
  systemLossTotal: number;
  
  // Distribution
  distributionTotal: number;
  distributionCharge: number;
  supplyCharge: number;
  meteringCharge: number;
  
  // Subsidies & Adjustments
  lifelineSubsidy: number;
  seniorSubsidy: number;
  isLifelineEligible: boolean;
  
  // Universal Charges & Government Mandates
  universalCharges: {
    missionary: number;
    environmental: number;
    strandedDebts: number;
    npcStrandedCont: number;
    redci: number;
    total: number;
  };
  fitAll: number;
  
  // Taxes
  generationVat: number;
  transmissionVat: number;
  systemLossVat: number;
  distributionVat: number;
  otherVat: number;
  totalVat: number;
  localFranchiseTax: number;
  
  // Final Totals
  subtotalBeforeTaxes: number;
  totalTaxesAndSubsidies: number;
  totalBill: number;
  effectiveRatePerKwh: number;
}

export interface PelpItem {
  control_no: string;
  brand: string;
  model: string;
  category: string;
  category_slug?: string;
  type?: string;
  monthly_energy_consumption_kwh?: number;
  cooling_capacity_kj_h?: number;
  cspf?: number;
  energy_efficiency_rating?: number;
  star_rating?: number;
  power_watts?: number;
  test_standard?: string;
  raw_specs?: Record<string, any>;
}

export interface PelpCategory {
  slug: string;
  name: string;
  icon: string;
  count: number;
  file: string;
}

export interface VisionScanResult {
  detected_brand?: string;
  detected_model?: string;
  detected_category?: string;
  detected_watts?: number;
  detected_voltage?: number;
  detected_monthly_kwh?: number;
  detected_energy_rating?: string;
  detected_star_rating?: number;
  raw_markdown?: string;
  confidence?: 'high' | 'medium' | 'low';
}
