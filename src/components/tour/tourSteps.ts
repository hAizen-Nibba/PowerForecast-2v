// Tour Step Definitions — Comprehensive Guided Tours across all PowerForecast modules
// Each step targets a verified `data-tour="<id>"` attribute in the DOM
// Bilingual support: English (en) and Filipino/Tagalog (tl)

export type TourLanguage = 'en' | 'tl';

export type TourPage =
  | 'dashboard'
  | 'calculator'
  | 'appliances'
  | 'calendar'
  | 'analytics'
  | 'forecasting';

export interface TourStepCopy {
  title: string;
  description: string;
}

export interface TourStep {
  id: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  copy: Record<TourLanguage, TourStepCopy>;
  page?: TourPage;
}

export interface PageTour {
  pageName: TourPage;
  pageTitle: Record<TourLanguage, string>;
  steps: TourStep[];
}

export const FULL_TOUR_PAGE_ORDER: TourPage[] = [
  'dashboard',
  'calculator',
  'appliances',
  'calendar',
  'analytics',
  'forecasting',
];

export const PAGE_TO_ROUTE: Record<TourPage, string> = {
  dashboard: '/dashboard',
  calculator: '/calculator',
  appliances: '/appliances',
  calendar: '/calendar',
  analytics: '/analytics',
  forecasting: '/forecasting',
};

export const ROUTE_TO_TOUR_PAGE: Record<string, TourPage> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/calculator': 'calculator',
  '/appliances': 'appliances',
  '/calendar': 'calendar',
  '/analytics': 'analytics',
  '/forecasting': 'forecasting',
};

export const PAGE_METADATA: Record<TourPage, { title: Record<TourLanguage, string>; icon: string }> = {
  dashboard: {
    title: { en: 'Dashboard & Telemetry', tl: 'Dashboard & Telemetry' },
    icon: 'Dashboard',
  },
  calculator: {
    title: { en: 'Meralco Bill Calculator', tl: 'Meralco Bill Calculator' },
    icon: 'Calculate',
  },
  appliances: {
    title: { en: 'Appliances Hub & Spaces', tl: 'Appliance Hub & Spaces' },
    icon: 'Bolt',
  },
  calendar: {
    title: { en: 'Smart Calendar & TOU', tl: 'Smart Calendar & Schedule' },
    icon: 'CalendarToday',
  },
  analytics: {
    title: { en: 'Analytics & Vampire Loss', tl: 'Analytics & Vampire Loss' },
    icon: 'Insights',
  },
  forecasting: {
    title: { en: 'Predictive Forecasting', tl: 'Predictive Forecasting' },
    icon: 'AutoGraph',
  },
};

// ─── 1. DASHBOARD ───────────────────────────────────────────
const dashboardTour: PageTour = {
  pageName: 'dashboard',
  pageTitle: {
    en: 'Dashboard & Live Telemetry Tour',
    tl: 'Dashboard & Live Telemetry Tour',
  },
  steps: [
    {
      id: 'dashboard-hero',
      placement: 'bottom',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Live Power Load & Instant Telemetry',
          description:
            'This real-time telemetry card monitors your aggregate household draw right now. See total running wattage (W), the number of active appliances, and your live billing velocity (₱/hour) computed against your actual Meralco tariff.',
        },
        tl: {
          title: 'Live Power Load & Real-Time Telemetry',
          description:
            'Ipinapakita sa telemetry card na ito ang kabuuang lakas ng kuryente na ginagamit ngayon. Makikita ang running wattage (W), active appliances, at live cost rate (₱/oras) batay sa iyong Meralco tariff.',
        },
      },
    },
    {
      id: 'nav-sidebar',
      placement: 'right',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Unified Navigation Hub',
          description:
            'Quickly switch across all PowerForecast modules: Bill Calculator, Appliance Inventory, Smart Calendar, Analytics, Forecasting, and API Documentation.',
        },
        tl: {
          title: 'Unified Navigation Menu',
          description:
            'Mabilis na lumipat sa iba\'t ibang features ng app: Bill Calculator, Appliance Hub, Smart Calendar, Analytics, Forecasting, at API Docs.',
        },
      },
    },
    {
      id: 'header-db-status',
      placement: 'top',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Database Cloud Sync & Offline Resilience',
          description:
            'Live connectivity indicator monitoring Supabase cloud sync and network latency. PowerForecast operates seamlessly offline using local caching and synchronizes changes automatically upon reconnection.',
        },
        tl: {
          title: 'Cloud Sync & Offline Mode',
          description:
            'Live status ng koneksyon sa Supabase cloud. Gumagana pa rin ang PowerForecast kahit offline gamit ang local cache, at awtomatikong magsi-sync kusa pagbalik ng internet.',
        },
      },
    },
    {
      id: 'dashboard-kpi-cards',
      placement: 'bottom',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Month-to-Date Audited Consumption & Goals',
          description:
            'Track cumulative monthly energy (kWh), current accrued cost, active circuits online, and daily average pacing. These metrics balance recorded telemetry with your baseline quota.',
        },
        tl: {
          title: 'Month-to-Date Consumption & Quotas',
          description:
            'Subaybayan ang naipong kWh ngayong buwan, kasalukuyang bayarin sa Meralco, active circuits online, at daily average burn rate.',
        },
      },
    },
    {
      id: 'dashboard-live-board',
      placement: 'top',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Interactive Appliance Control Board',
          description:
            'Turn appliances on and off in real time with a single click. PowerForecast automatically calculates running time and live cost accumulation with midnight rollover protection.',
        },
        tl: {
          title: 'Interactive Appliance Controls',
          description:
            'I-on o i-off ang appliances sa isang click para sa real-time stopwatch session. Awtomatikong kinakalkula ang running time at live cost nang may midnight rollover protection.',
        },
      },
    },
    {
      id: 'dashboard-donut',
      placement: 'left',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Energy Distribution Breakdown',
          description:
            'Visual breakdown of your energy consumption by category — discover whether cooling, refrigeration, laundry, or entertainment accounts for the bulk of your power draw.',
        },
        tl: {
          title: 'Energy Distribution bawat Category',
          description:
            'Visual breakdown ng kuryente bawat category — alamin kung cooling, refrigeration, laundry, o entertainment ang pinakamalaking humihigop ng kuryente.',
        },
      },
    },
    {
      id: 'dashboard-quick-actions',
      placement: 'top',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Quick Module Launchpad',
          description:
            'Shortcuts to quickly open the Meralco Bill Calculator, manage appliances, schedule calendar routines, or explore deep analytics.',
        },
        tl: {
          title: 'Quick Actions Launchpad',
          description:
            'Diretsong shortcuts patungo sa Bill Calculator, Appliance Hub, Smart Calendar, o deep analytics.',
        },
      },
    },
  ],
};

// ─── 2. CALCULATOR ──────────────────────────────────────────
const calculatorTour: PageTour = {
  pageName: 'calculator',
  pageTitle: {
    en: 'Meralco Bill Calculator Tour',
    tl: 'Meralco Bill Calculator Tour',
  },
  steps: [
    {
      id: 'calculator-space-comparison',
      placement: 'bottom',
      page: 'calculator',
      copy: {
        en: {
          title: 'Tariff Mode Selection',
          description:
            'Toggle between standard Meralco Residential rates and General Power Commercial tariffs with unbundled demand and generation structures.',
        },
        tl: {
          title: 'Tariff Selection (Residential vs Commercial)',
          description:
            'Pumili sa pagitan ng standard Meralco Residential rates at General Power Commercial tariffs na may unbundled demand at generation rates.',
        },
      },
    },
    {
      id: 'calculator-subsidies',
      placement: 'bottom',
      page: 'calculator',
      copy: {
        en: {
          title: 'Base Generation Charge & Pass-Through',
          description:
            'Customize or inspect the generation charge per kWh. Meralco generation costs fluctuate monthly per ERC pass-through rules — adjust or test scenario rates here.',
        },
        tl: {
          title: 'Generation Charge & ERC Pass-Through',
          description:
            'I-customize o suriin ang generation charge kada kWh. Ang generation charge ng Meralco ay nagbabago buwan-buwan ayon sa ERC pass-through — pwede kang mag-test ng scenarios dito.',
        },
      },
    },
    {
      id: 'calculator-kwh-slider',
      placement: 'bottom',
      page: 'calculator',
      copy: {
        en: {
          title: 'Monthly Consumption Slider',
          description:
            'Quickly adjust monthly kWh consumption from 0 to 1,000+ kWh to see instant projected charges and observe lifeline subsidy thresholds (≤100 kWh).',
        },
        tl: {
          title: 'Monthly Consumption Slider (kWh)',
          description:
            'I-adjust ang monthly kWh consumption mula 0 hanggang 1,000+ kWh para makita agad ang bill impact at lifeline subsidy brackets (≤100 kWh).',
        },
      },
    },
    {
      id: 'calculator-summary',
      placement: 'left',
      page: 'calculator',
      copy: {
        en: {
          title: 'Total Projected Amount Due',
          description:
            'Your complete projected Meralco electric bill with effective rate per kWh, power supply costs, and other regulated grid pass-through fees.',
        },
        tl: {
          title: 'Total Projected Bill',
          description:
            'Kumpletong projected electric bill sa Meralco kasama ang effective rate bawat kWh, generation charge, at iba pang unbundled grid pass-through fees.',
        },
      },
    },
    {
      id: 'calculator-unbundled',
      placement: 'top',
      page: 'calculator',
      copy: {
        en: {
          title: 'ERC Unbundled Cost Share Distribution',
          description:
            'Full transparent breakdown of statutory bill components: Generation, Transmission, System Loss, Distribution, Subsidies, Government Taxes (VAT), and Universal Charges.',
        },
        tl: {
          title: 'ERC Unbundled Cost Breakdown',
          description:
            'Transparent na breakdown ng lahat ng components: Generation, Transmission, System Loss, Distribution, Subsidies, Government Taxes (VAT), at Universal Charges.',
        },
      },
    },
    {
      id: 'calculator-whatif',
      placement: 'top',
      page: 'calculator',
      copy: {
        en: {
          title: 'What-If Savings Simulator',
          description:
            'Simulate monthly bill savings by trimming daily usage hours across your appliances. See immediate peso and kWh reductions.',
        },
        tl: {
          title: 'What-If Savings Simulator',
          description:
            'I-simulate kung gaano kalaki ang matitipid sa monthly bill sa pamamagitan ng pagbawas ng daily usage hours sa appliances mo.',
        },
      },
    },
  ],
};

// ─── 3. APPLIANCES ──────────────────────────────────────────
const appliancesTour: PageTour = {
  pageName: 'appliances',
  pageTitle: {
    en: 'Appliances Hub & Spaces Tour',
    tl: 'Appliances Hub & Spaces Tour',
  },
  steps: [
    {
      id: 'appliance-space-tabs',
      placement: 'bottom',
      page: 'appliances',
      copy: {
        en: {
          title: 'Multi-Space Sub-Metering Tabs',
          description:
            'Organize your appliances across different properties or zones — like Main House, Rental Suite, Garage Workshop, or Commercial Unit — each with its own tariff.',
        },
        tl: {
          title: 'Multi-Space Sub-Metering Tabs',
          description:
            'I-organize ang appliances ayon sa spaces o sub-meters — tulad ng Main House, Rental Suite, o Negosyo — bawat isa may sariling custom tariff.',
        },
      },
    },
    {
      id: 'appliance-space-manage',
      placement: 'bottom',
      page: 'appliances',
      copy: {
        en: {
          title: 'Space Configuration & Tariffs',
          description:
            'Configure space names, assign residential or commercial rates, or adjust sub-meter parameters for dedicated space accounting.',
        },
        tl: {
          title: 'Space Settings & Tariffs',
          description:
            'I-customize ang space names, magtalaga ng residential o commercial Meralco tariff, at ayusin ang sub-meter parameters.',
        },
      },
    },
    {
      id: 'appliance-add-buttons',
      placement: 'bottom',
      page: 'appliances',
      copy: {
        en: {
          title: 'Pre-Loaded Appliance Library & AI Scanner',
          description:
            'Add custom appliances, scan nameplate stickers with AI Vision, or choose from hundreds of verified DOE PELP presets with calibrated wattages and standby loss.',
        },
        tl: {
          title: 'Appliance Library, Presets & AI Scanner',
          description:
            'Magdagdag ng custom appliances, mag-scan ng nameplate gamit ang AI Vision, o pumili mula sa daan-daang verified DOE PELP presets na may tamang wattage at standby loss.',
        },
      },
    },
    {
      id: 'appliance-filters',
      placement: 'bottom',
      page: 'appliances',
      copy: {
        en: {
          title: 'Search, Room Filtering & Sorting',
          description:
            'Instantly search through your devices or filter by room (Living Room, Kitchen, Bedroom, Office). Sort by wattage or cost impact.',
        },
        tl: {
          title: 'Search, Room Filter & Sorting',
          description:
            'Mabilisang hanapin ang appliances gamit ang search bar o i-filter ayon sa room (Living Room, Kitchen, Bedroom, Office). I-sort ayon sa wattage o monthly cost.',
        },
      },
    },
    {
      id: 'appliance-card',
      placement: 'top',
      page: 'appliances',
      copy: {
        en: {
          title: 'Appliance Card & Real-Time Controls',
          description:
            'Inspect wattage, daily operational hours, monthly cost share, and inverter efficiency grade. Toggle the switch to track live running sessions.',
        },
        tl: {
          title: 'Appliance Card & Real-Time Controls',
          description:
            'Suriin ang wattage, daily hours, monthly spend, at inverter efficiency rating. I-toggle ang switch para simulan ang live tracking session.',
        },
      },
    },
  ],
};

// ─── 4. CALENDAR ────────────────────────────────────────────
const calendarTour: PageTour = {
  pageName: 'calendar',
  pageTitle: {
    en: 'Smart Calendar & Time-of-Use Tour',
    tl: 'Smart Calendar & Schedule Tour',
  },
  steps: [
    {
      id: 'calendar-billing-period',
      placement: 'bottom',
      page: 'calendar',
      copy: {
        en: {
          title: 'Billing Cycle & Cutoff Navigator',
          description:
            'Navigate between billing cycles or calendar months. Customize your exact Meralco meter read cutoff dates for cycle-accurate cost matching.',
        },
        tl: {
          title: 'Billing Cycle & Cutoff Navigator',
          description:
            'Lumipat sa iba\'t ibang billing cycles at calendar months. Itakda ang eksaktong meter read cutoff date ng Meralco para match ang bill cycle mo.',
        },
      },
    },
    {
      id: 'calendar-legend',
      placement: 'bottom',
      page: 'calendar',
      copy: {
        en: {
          title: 'Visual Status Legend & Day Types',
          description:
            'Color-coded indicators distinguish logged actual stopwatch sessions, routine baselines, custom simulated schedules, and net savings.',
        },
        tl: {
          title: 'Visual Status Legend & Day Types',
          description:
            'Color-coded indicators para madaling makilala ang logged sessions sa stopwatch, routine baseline, custom simulated schedules, at net savings.',
        },
      },
    },
    {
      id: 'calendar-kpi-summary',
      placement: 'bottom',
      page: 'calendar',
      copy: {
        en: {
          title: 'Actual vs Simulated Period KPIs',
          description:
            'Compare your verified actual spend against simulated schedules, tracking measured kWh and projected savings versus baseline.',
        },
        tl: {
          title: 'Actual vs Simulated Period KPIs',
          description:
            'Ikumpara ang verified actual spend laban sa simulated schedules, at subaybayan ang measured kWh at projected savings kumpara sa baseline.',
        },
      },
    },
    {
      id: 'calendar-grid',
      placement: 'top',
      page: 'calendar',
      copy: {
        en: {
          title: 'Interactive Monthly Heatmap Grid',
          description:
            'Day-by-day interactive calendar displaying logged energy draw (kWh) and peso value for each day of the month.',
        },
        tl: {
          title: 'Interactive Monthly Heatmap Grid',
          description:
            'Araw-araw na calendar grid na nagpapakita ng naitalang kuryente (kWh) at halaga sa piso para sa bawat araw ng buwan.',
        },
      },
    },
    {
      id: 'calendar-day-click',
      placement: 'top',
      page: 'calendar',
      copy: {
        en: {
          title: 'Daily Log & Appliance Details',
          description:
            'Click any day cell to open the details modal, view active appliances, or log actual meter readings for that date.',
        },
        tl: {
          title: 'Daily Log & Appliance Details',
          description:
            'Pindutin ang kahit anong araw para buksan ang details modal, makita ang ginamit na appliances, o magtala ng meter reading.',
        },
      },
    },
  ],
};

// ─── 5. ANALYTICS ───────────────────────────────────────────
const analyticsTour: PageTour = {
  pageName: 'analytics',
  pageTitle: {
    en: 'Analytics & Energy Audit Tour',
    tl: 'Analytics & Energy Audit Tour',
  },
  steps: [
    {
      id: 'analytics-kpi-row',
      placement: 'bottom',
      page: 'analytics',
      copy: {
        en: {
          title: 'Energy Volume & Inverter Efficiency KPIs',
          description:
            'High-level audit metrics covering total monthly kWh, forecasted bill, DOE PELP compliance rating, and standby loss totals.',
        },
        tl: {
          title: 'Energy Volume & Efficiency KPIs',
          description:
            'High-level audit metrics: monthly kWh volume, forecasted spend, DOE PELP efficiency rating, at standby loss totals.',
        },
      },
    },
    {
      id: 'analytics-vampire-load',
      placement: 'bottom',
      page: 'analytics',
      copy: {
        en: {
          title: 'Standby Vampire Load Audit',
          description:
            'Audit phantom energy consumed by appliances left plugged in on standby mode. See monthly and annual costs, plus potential cutoff savings.',
        },
        tl: {
          title: 'Standby Vampire Load Audit',
          description:
            'Alamin ang kuryenteng nasasayang sa mga nakasaksak na appliances kahit nakapatay (phantom load). Makikita ang monthly at annual costs at potential cutoff savings.',
        },
      },
    },
    {
      id: 'analytics-category-bars',
      placement: 'top',
      page: 'analytics',
      copy: {
        en: {
          title: 'Category Share & Pareto (80/20 Rule)',
          description:
            'Identifies your top energy-consuming devices following the 80/20 rule. Focus your energy-saving efforts where they make the largest financial impact.',
        },
        tl: {
          title: 'Category Share & Pareto (80/20 Rule)',
          description:
            'Tinutukoy ang top energy-consuming appliances gamit ang 80/20 rule para malaman kung saan pinakamalaki ang matitipid.',
        },
      },
    },
    {
      id: 'analytics-historical-trend',
      placement: 'top',
      page: 'analytics',
      copy: {
        en: {
          title: 'Multi-Month Trend & Baseline Forecast',
          description:
            'Compare active billing cycle telemetry alongside recorded history and forward-looking baseline projections based on your appliance routines.',
        },
        tl: {
          title: 'Multi-Month Trend & Baseline Forecast',
          description:
            'Subaybayan ang takbo ng kuryente sa mga nakaraang buwan at ihambing ang kasalukuyang billing cycle sa iyong routine baseline.',
        },
      },
    },
    {
      id: 'analytics-insights',
      placement: 'top',
      page: 'analytics',
      copy: {
        en: {
          title: 'AI Smart Energy Audit & Actionable Insights',
          description:
            'Practical, tailored recommendations based on your appliance load profile and Meralco tariff structure to optimize your monthly expenses.',
        },
        tl: {
          title: 'AI Energy Audit & Actionable Insights',
          description:
            'Praktikal na recommendations mula sa AI batay sa iyong appliances at Meralco tariff para mapababa ang monthly bill.',
        },
      },
    },
  ],
};

// ─── 6. FORECASTING ─────────────────────────────────────────
const forecastingTour: PageTour = {
  pageName: 'forecasting',
  pageTitle: {
    en: 'Predictive Energy Forecasting Tour',
    tl: 'Predictive Energy Forecasting Tour',
  },
  steps: [
    {
      id: 'forecasting-space-tabs',
      placement: 'bottom',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Forecast Scope & Target Space',
          description:
            'Switch forecast models between individual spaces or evaluate consolidated projections across all properties combined.',
        },
        tl: {
          title: 'Forecast Scope & Target Space',
          description:
            'Pumili kung para sa partikular na space o para sa pinagsama-samang konsumo ng buong bahay ang projection.',
        },
      },
    },
    {
      id: 'forecasting-hero-kpi',
      placement: 'bottom',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Active Billing Cycle Run-Rate Telemetry',
          description:
            'Blends month-to-date recorded actuals with remaining days projection based on your daily appliance routines for maximum forecasting accuracy.',
        },
        tl: {
          title: 'Active Billing Cycle Run-Rate Telemetry',
          description:
            'Pinagsasama ang month-to-date recorded actuals at ang projection para sa remaining days batay sa daily appliance routines mo.',
        },
      },
    },
    {
      id: 'forecasting-budget-sentinel',
      placement: 'top',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Monthly Budget Sentinel & Breach Guard',
          description:
            'Set your monthly electricity spending cap, monitor daily burn rate, and receive proactive breach day projections with safe daily kWh allowances.',
        },
        tl: {
          title: 'Monthly Budget Sentinel & Breach Guard',
          description:
            'Magtakda ng monthly budget cap, bantayan ang daily burn rate, at alamin kung anong araw posibleng lumampas sa budget para maagapan.',
        },
      },
    },
    {
      id: 'forecasting-virtual-bill',
      placement: 'top',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Projected Meralco Statement Breakdown ("Virtual Bill")',
          description:
            'Authentic ERC unbundled cost decomposition showing generation, distribution, transmission, system loss, and government taxes (VAT).',
        },
        tl: {
          title: 'Projected Meralco Statement ("Virtual Bill")',
          description:
            'Eksaktong ERC unbundled cost breakdown na naghihiwalay sa generation, distribution, transmission, system loss, at government taxes (VAT).',
        },
      },
    },
    {
      id: 'forecasting-whatif-studio',
      placement: 'top',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Interactive "What-If" Appliance Studio',
          description:
            'Adjust runtime sliders on specific appliances to simulate real-time bill impacts and test whether your plan achieves your monthly budget target.',
        },
        tl: {
          title: 'Interactive "What-If" Appliance Studio',
          description:
            'I-adjust ang runtime sliders sa specific appliances para makita agad ang real-time effect sa monthly bill at kung pasok sa target budget mo.',
        },
      },
    },
    {
      id: 'forecasting-advisory',
      placement: 'top',
      page: 'forecasting',
      copy: {
        en: {
          title: 'ERC & Meralco Regulatory Advisory',
          description:
            'Contextual advisories explaining regulatory pass-through charges, fuel cost adjustments, and energy conservation tips.',
        },
        tl: {
          title: 'ERC & Meralco Regulatory Advisory',
          description:
            'Contextual advisories ukol sa regulatory pass-through charges, fuel cost adjustments, at energy-saving tips.',
        },
      },
    },
  ],
};

// ─── Export Registry ─────────────────────────────────────────
export const ALL_PAGE_TOURS: Record<TourPage, PageTour> = {
  dashboard: dashboardTour,
  calculator: calculatorTour,
  appliances: appliancesTour,
  calendar: calendarTour,
  analytics: analyticsTour,
  forecasting: forecastingTour,
};

export function getTourForPage(pageName: string): PageTour | null {
  return (ALL_PAGE_TOURS as Record<string, PageTour>)[pageName] || null;
}

export function getNextPageInTour(currentPage: TourPage): TourPage | null {
  const currentIndex = FULL_TOUR_PAGE_ORDER.indexOf(currentPage);
  if (currentIndex === -1 || currentIndex >= FULL_TOUR_PAGE_ORDER.length - 1) {
    return null;
  }
  return FULL_TOUR_PAGE_ORDER[currentIndex + 1];
}

export function getPrevPageInTour(currentPage: TourPage): TourPage | null {
  const currentIndex = FULL_TOUR_PAGE_ORDER.indexOf(currentPage);
  if (currentIndex <= 0) {
    return null;
  }
  return FULL_TOUR_PAGE_ORDER[currentIndex - 1];
}
