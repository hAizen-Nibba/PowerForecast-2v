// Tour Step Definitions — 30 steps across 6 pages × 3 languages
// Each step targets a `data-tour="<id>"` attribute on the page

export type TourLanguage = 'en' | 'tl' | 'taglish';

export interface TourStepCopy {
  title: string;
  description: string;
}

export interface TourStep {
  id: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  copy: Record<TourLanguage, TourStepCopy>;
}

export interface PageTour {
  pageName: string;
  pageTitle: Record<TourLanguage, string>;
  steps: TourStep[];
}

// ─── DASHBOARD ───────────────────────────────────────────────
const dashboardTour: PageTour = {
  pageName: 'dashboard',
  pageTitle: {
    en: 'Dashboard Tour',
    tl: 'Gabay sa Dashboard',
    taglish: 'Dashboard Tour',
  },
  steps: [
    {
      id: 'dashboard-hero',
      placement: 'bottom',
      copy: {
        en: {
          title: '⚡ Real-Time Active Power & Running Rate',
          description:
            'This is your live command center. See the total wattage currently being drawn by all running appliances, plus the real-time ₱/hr running rate so you know exactly how much electricity costs you every hour.',
        },
        tl: {
          title: '⚡ Live na Kuryente at Running Rate',
          description:
            'Ito ang iyong live command center. Dito makikita ang kabuuang wattage ng lahat ng bukas na appliance, kasama ang ₱/hr running rate para alam mo kung magkano ang pumapatak na gastos bawat oras.',
        },
        taglish: {
          title: '⚡ Real-Time Active Power & Running Rate',
          description:
            'Dito mo makikita ang kasalukuyang wattage na sabay-sabay na tumatakbo sa iyong bahay. Kasama rin dito ang live ₱/hr running rate para alam mo kung magkano ang pumapatak na gastos bawat oras habang nakabukas ang mga gamit.',
        },
      },
    },
    {
      id: 'dashboard-kpi-cards',
      placement: 'bottom',
      copy: {
        en: {
          title: '📊 Monthly Projected Bill & Energy Volume',
          description:
            'Your monthly summary at a glance: projected Meralco bill based on active appliances, total kWh volume (Lifeline or Standard rate), number of online appliances, and daily burn rate.',
        },
        tl: {
          title: '📊 Buwanang Bill at Energy Volume',
          description:
            'Ang iyong buwanang buod: tinatayang Meralco bill base sa mga aktibong appliance, kabuuang kWh volume (Lifeline o Standard rate), dami ng bukas na appliance, at daily burn rate.',
        },
        taglish: {
          title: '📊 Monthly Projected Bill & Energy Volume',
          description:
            'Ito ang iyong buwanang summary: Ang tinatayang Meralco bill mo base sa active appliances, kabuuang kWh volume (kung Lifeline o Standard rate ka), dami ng bukas na appliances, at daily burn rate.',
        },
      },
    },
    {
      id: 'dashboard-space-split',
      placement: 'bottom',
      copy: {
        en: {
          title: '🏢 Multi-Space & Sub-Metering Split',
          description:
            'Have a rental, store, or separate room? See the consumption split and corresponding bill per space using the correct Residential or Commercial Meralco tariff.',
        },
        tl: {
          title: '🏢 Multi-Space at Sub-Metering',
          description:
            'May paupahan, tindahan, o hiwalay na kwarto ka ba? Dito makikita ang hatian ng konsumo at kaukulang bill kada space gamit ang tamang Residential o Commercial na taripa.',
        },
        taglish: {
          title: '🏢 Multi-Space & Sub-Metering Split',
          description:
            'May paupahan, tindahan, o hiwalay na kwarto ka ba? Dito mo makikita ang hatian ng konsumo at kaukulang bill kada space gamit ang tamang Residential o Commercial Meralco tariff.',
        },
      },
    },
    {
      id: 'dashboard-live-board',
      placement: 'top',
      copy: {
        en: {
          title: '🔌 Circuit Breaker & Live Power Toggles',
          description:
            'Try clicking these! Toggle any appliance circuit ON or OFF to instantly see how much wattage and cost changes in your live dashboard.',
        },
        tl: {
          title: '🔌 Circuit Breaker at Live Power Toggles',
          description:
            'Subukan itong pindutin! I-toggle ang circuit ng bawat appliance para makita agad kung gaano ang mababawas o madadagdag sa live wattage at gastos.',
        },
        taglish: {
          title: '🔌 Circuit Breaker & Live Power Toggles',
          description:
            'Subukan itong pindutin! Pwede mong i-turn ON o OFF ang circuit ng bawat appliance para makita agad kung gaano kalaki ang mababawas o madadagdag sa live wattage at gastos.',
        },
      },
    },
    {
      id: 'dashboard-donut',
      placement: 'left',
      copy: {
        en: {
          title: '🍩 Energy Breakdown by Category',
          description:
            'The donut chart shows which appliance category (Cooling, Cooking, Lighting) consumes the largest percentage of your electricity this month.',
        },
        tl: {
          title: '🍩 Hatian ng Kuryente ayon sa Kategorya',
          description:
            'Ipinapakita ng donut chart kung aling kategorya (Cooling, Cooking, Lighting) ang kumakain ng pinakamalaking porsyento ng iyong kuryente ngayong buwan.',
        },
        taglish: {
          title: '🍩 Energy Breakdown by Category',
          description:
            'Ipinapakita ng donut chart kung aling appliance o kategorya (Cooling, Cooking, Lighting) ang kumakain ng pinakamalaking porsyento ng iyong kuryente ngayong buwan.',
        },
      },
    },
    {
      id: 'dashboard-quick-actions',
      placement: 'top',
      copy: {
        en: {
          title: '🚀 Quick Navigation Modules',
          description:
            'Jump directly to the Bill Calculator, Appliance Hub, or Smart Calendar from these quick-access cards.',
        },
        tl: {
          title: '🚀 Mga Mabilisang Shortcut',
          description:
            'Dumiretso sa Bill Calculator, Appliance Hub, o Smart Calendar mula sa mga quick-access cards na ito.',
        },
        taglish: {
          title: '🚀 Quick Navigation Modules',
          description:
            'Jump directly sa Bill Calculator, Appliance Hub, o Smart Calendar mula sa mga quick-access cards na ito.',
        },
      },
    },
  ],
};

// ─── BILL CALCULATOR ────────────────────────────────────────
const calculatorTour: PageTour = {
  pageName: 'calculator',
  pageTitle: {
    en: 'Bill Calculator Tour',
    tl: 'Gabay sa Bill Calculator',
    taglish: 'Bill Calculator Tour',
  },
  steps: [
    {
      id: 'calc-tariff-selector',
      placement: 'bottom',
      copy: {
        en: {
          title: '🏠 Residential vs Commercial Tariff',
          description:
            'Select whether your meter is a Residential account or General Power (Commercial/Store). The system automatically applies the correct distribution tiers and demand charge structure.',
        },
        tl: {
          title: '🏠 Residential vs Commercial na Taripa',
          description:
            'Piliin kung Residential account o General Power (Commercial/Tindahan) ang iyong metro. Awtomatikong ia-apply ng system ang tamang distribution tiers at demand charge structure.',
        },
        taglish: {
          title: '🏠 Residential vs Commercial Tariff',
          description:
            'Piliin kung Residential account o General Power (Commercial/Store) ang iyong metro. Awtomatikong ia-apply ng system ang tamang distribution tiers at demand charge structure.',
        },
      },
    },
    {
      id: 'calc-kwh-slider',
      placement: 'bottom',
      copy: {
        en: {
          title: '⚡ Monthly Consumption (kWh)',
          description:
            'Drag the slider or type your kWh reading from your Meralco bill. Instantly see the effect on total charges and whether you qualify for the Lifeline Subsidy discount (1-100 kWh).',
        },
        tl: {
          title: '⚡ Buwanang Konsumo (kWh)',
          description:
            'I-drag ang slider o i-type ang kWh reading mula sa iyong Meralco bill. Makikita mo agad ang epekto nito sa kabuuang bayarin at kung pasok ka sa Lifeline Subsidy discount (1-100 kWh).',
        },
        taglish: {
          title: '⚡ Monthly Consumption (kWh)',
          description:
            'I-drag ang slider o i-type ang kWh reading mula sa iyong Meralco bill. Makikita mo agad ang epekto nito sa kabuuang bayarin at kung pasok ka sa Lifeline Subsidy discount (1-100 kWh).',
        },
      },
    },
    {
      id: 'calc-subsidies',
      placement: 'bottom',
      copy: {
        en: {
          title: '🏷️ Subsidies & Rate Adjustments',
          description:
            'Check the Senior Citizen discount if your meter is registered (5% discount under 100 kWh), and adjust the Generation Rate if Meralco announced a price adjustment this month.',
        },
        tl: {
          title: '🏷️ Mga Subsidiya at Pag-adjust ng Rate',
          description:
            'I-check ang Senior Citizen discount kung rehistrado ang inyong metro (5% discount under 100 kWh), at i-adjust ang Generation Rate kung may anunsyo si Meralco na price adjustment ngayong buwan.',
        },
        taglish: {
          title: '🏷️ Subsidies & Rate Adjustments',
          description:
            'I-check ang Senior Citizen discount kung rehistrado ang inyong metro (5% discount under 100 kWh), at i-adjust ang Generation Rate kung nag-anunsyo si Meralco ng price adjustment ngayong buwan.',
        },
      },
    },
    {
      id: 'calc-unbundled',
      placement: 'top',
      copy: {
        en: {
          title: '📑 Unbundled 5-Pillar Rate Breakdown',
          description:
            'Not all charges go to Meralco! See the transparent breakdown: Generation (Power Plants), Transmission (NGCP Grid), System Loss, Distribution (Meralco), and Government Taxes (VAT & Universal Charges).',
        },
        tl: {
          title: '📑 Unbundled 5-Pillar na Rate Breakdown',
          description:
            'Hindi lang sa Meralco napupunta ang bayad! Dito makikita ang transparent na breakdown: Generation (Power Plants), Transmission (NGCP Grid), System Loss, Distribution (Meralco), at Government Taxes (VAT & Universal Charges).',
        },
        taglish: {
          title: '📑 Unbundled 5-Pillar Rate Breakdown',
          description:
            'Hindi lang sa Meralco napupunta ang bayad! Dito mo makikita ang transparent breakdown: Generation (Power Plants), Transmission (NGCP Grid), System Loss, Distribution (Meralco), at Government Taxes (VAT & Universal Charges).',
        },
      },
    },
    {
      id: 'calc-whatif',
      placement: 'top',
      copy: {
        en: {
          title: '💡 What-If Savings Simulator',
          description:
            'Want to reduce your bill? Enter an appliance wattage and how many hours per day you\'d cut — we\'ll show you the exact Pesos (₱) and kWh you\'d save per month!',
        },
        tl: {
          title: '💡 What-If Savings Simulator',
          description:
            'Gusto mong magbawas ng bill? Ipasok ang wattage ng appliance at kung ilang oras mo ito babawasan bawat araw — ipapakita namin ang eksaktong Pesos (₱) at kWh na matitipid mo kada buwan!',
        },
        taglish: {
          title: '💡 What-If Savings Simulator',
          description:
            'Gusto mong magbawas ng bill? Ipasok ang wattage ng appliance at kung ilang oras mo ito babawasan bawat araw — ipapakita namin ang eksaktong Pesos (₱) at kWh na matitipid mo kada buwan!',
        },
      },
    },
  ],
};

// ─── APPLIANCE HUB ──────────────────────────────────────────
const appliancesTour: PageTour = {
  pageName: 'appliances',
  pageTitle: {
    en: 'Appliance Hub Tour',
    tl: 'Gabay sa Appliance Hub',
    taglish: 'Appliance Hub Tour',
  },
  steps: [
    {
      id: 'appliance-space-tabs',
      placement: 'bottom',
      copy: {
        en: {
          title: '🗂️ Organize by Spaces / Sub-Meters',
          description:
            'Separate appliances into "Main House", "Commercial Sari-Sari Store", or "Apartment Unit 2". Each space has its own tariff rate and independent bill computation.',
        },
        tl: {
          title: '🗂️ Ayusin ayon sa Spaces / Sub-Meters',
          description:
            'Ihiwalay ang mga appliance sa "Main House", "Commercial Sari-Sari Store", o "Apartment Unit 2". Bawat space ay may sariling tariff rate at independent bill computation.',
        },
        taglish: {
          title: '🗂️ Organize by Spaces / Sub-Meters',
          description:
            'Ihiwalay ang appliances sa "Main House", "Commercial Sari-Sari Store", o "Apartment Unit 2". Bawat space ay may sariling tariff rate at independent bill computation.',
        },
      },
    },
    {
      id: 'appliance-add-buttons',
      placement: 'bottom',
      copy: {
        en: {
          title: '➕ Add Appliances & Smart Tools',
          description:
            'Add your own appliance with "Add Appliance", pick from thousands of certified units in the DOE PELP Database for automatic wattage & star ratings, or use the AI Scanner to photograph nameplates!',
        },
        tl: {
          title: '➕ Magdagdag ng Appliance at Smart Tools',
          description:
            'Mag-add ng sariling appliance, pumili mula sa libu-libong certified units sa DOE PELP Database para automatic ang wattage at star rating, o gamitin ang AI Scanner para picturan ang nameplate!',
        },
        taglish: {
          title: '➕ Add Appliances & Smart Tools',
          description:
            'Mag-add ng sariling appliance gamit ang "Add Appliance", o pumili mula sa libu-libong certified items sa DOE PELP Database para automatic ang wattage at star rating, o gamitin ang AI Scanner para picturan ang nameplate!',
        },
      },
    },
    {
      id: 'appliance-card',
      placement: 'bottom',
      copy: {
        en: {
          title: '⚡ Appliance Card Controls',
          description:
            'Each card has a power button for live load toggling, monthly consumption info, edit button to change usage hours, and a schedule button to plan it directly on the Smart Calendar.',
        },
        tl: {
          title: '⚡ Mga Kontrol ng Appliance Card',
          description:
            'Bawat card ay may power button para sa live load, impormasyon sa buwanang konsumo, edit button para baguhin ang oras ng gamit, at button para i-schedule sa Smart Calendar.',
        },
        taglish: {
          title: '⚡ Appliance Card Controls',
          description:
            'Bawat card ay may power button para sa live load, impormasyon sa buwanang konsumo, edit button para baguhin ang oras ng gamit, at button para i-schedule direkta sa Smart Calendar.',
        },
      },
    },
    {
      id: 'appliance-filters',
      placement: 'bottom',
      copy: {
        en: {
          title: '🔍 Search & Filter',
          description:
            'Easily find appliances by category filter (Cooling, Kitchen, Entertainment, Lighting) or room filter (Living Room, Master Bedroom, Dirty Kitchen).',
        },
        tl: {
          title: '🔍 Maghanap at Mag-filter',
          description:
            'Madaling hanapin ang mga gamit sa pamamagitan ng category filter (Cooling, Kitchen, Entertainment, Lighting) o room filter (Living Room, Master Bedroom, Dirty Kitchen).',
        },
        taglish: {
          title: '🔍 Search & Filter',
          description:
            'Madaling hanapin ang mga gamit sa pamamagitan ng category filter (Cooling, Kitchen, Entertainment, Lighting) o room filter (Living Room, Master Bedroom, Dirty Kitchen).',
        },
      },
    },
    {
      id: 'appliance-space-manage',
      placement: 'left',
      copy: {
        en: {
          title: '⚙️ Space & Tariff Management',
          description:
            'Manage your spaces here — rename, change tariff type (Residential ↔ Commercial), set as default, or delete spaces you no longer need.',
        },
        tl: {
          title: '⚙️ Space at Tariff Management',
          description:
            'Pamahalaan ang iyong mga space dito — palitan ang pangalan, baguhin ang tariff type (Residential ↔ Commercial), i-set bilang default, o burahin ang mga hindi na kailangan.',
        },
        taglish: {
          title: '⚙️ Space & Tariff Management',
          description:
            'Manage ang iyong mga space dito — rename, change tariff type (Residential ↔ Commercial), set as default, o delete ang mga hindi na kailangan.',
        },
      },
    },
  ],
};

// ─── SMART CALENDAR ─────────────────────────────────────────
const calendarTour: PageTour = {
  pageName: 'calendar',
  pageTitle: {
    en: 'Smart Calendar Tour',
    tl: 'Gabay sa Smart Calendar',
    taglish: 'Smart Calendar Tour',
  },
  steps: [
    {
      id: 'calendar-live-sessions',
      placement: 'bottom',
      copy: {
        en: {
          title: '⏱️ Live Stopwatch & Real-Time Cost Tracker',
          description:
            'When you turn on an appliance, the live session ticker appears here. Every second counts accumulated wattage and pesos (₱). Stop it anytime to generate a usage receipt.',
        },
        tl: {
          title: '⏱️ Live Stopwatch at Real-Time Cost Tracker',
          description:
            'Kapag may appliance kang binuksan, lalabas dito ang live session ticker. Bawat segundo ay binibilang ang naipong wattage at piso (₱). I-stop ito anumang oras para makagawa ng usage receipt.',
        },
        taglish: {
          title: '⏱️ Live Stopwatch & Real-Time Cost Tracker',
          description:
            'Kapag may appliance kang binuksan, lalabas dito ang live session ticker. Bawat segundo ay binibilang ang naipong wattage at piso (₱). Pwede mo itong i-stop anumang oras para makagawa ng usage receipt.',
        },
      },
    },
    {
      id: 'calendar-routine-autofill',
      placement: 'bottom',
      copy: {
        en: {
          title: '✨ 1-Click Routine Autofill',
          description:
            'Too lazy to schedule one by one? Use Routine Autofill for 1-click generation of your regular daily habits (like 8-hr night aircon, morning refrigerator, evening lighting).',
        },
        tl: {
          title: '✨ 1-Click Routine Autofill',
          description:
            'Tinatamad mag-schedule isa-isa? Gamitin ang Routine Autofill para sa 1-click generation ng regular mong daily habits (tulad ng 8-hr night aircon, morning refrigerator, evening lighting).',
        },
        taglish: {
          title: '✨ 1-Click Routine Autofill',
          description:
            'Tinatamad mag-schedule isa-isa? Gamitin ang Routine Autofill para sa 1-click generation ng regular mong daily habits (tulad ng 8-hr night aircon, morning refrigerator, evening lighting).',
        },
      },
    },
    {
      id: 'calendar-grid',
      placement: 'top',
      copy: {
        en: {
          title: '🗓️ Daily Energy Cost Heatmap',
          description:
            'Each calendar day shows a color and badge indicating total kWh and cost (₱) for that day. The more intense the color, the higher the consumption.',
        },
        tl: {
          title: '🗓️ Daily Energy Cost Heatmap',
          description:
            'Bawat araw sa kalendaryo ay may kulay at badge na nagpapakita ng kabuuang kWh at gastos (₱) sa araw na iyon. Mas matingkad ang kulay, mas mataas ang konsumo.',
        },
        taglish: {
          title: '🗓️ Daily Energy Cost Heatmap',
          description:
            'Bawat araw sa kalendaryo ay may kulay at badge na nagpapakita ng kabuuang kWh at gastos (₱) sa araw na iyon. Mas matingkad ang kulay, mas mataas ang konsumo.',
        },
      },
    },
    {
      id: 'calendar-day-click',
      placement: 'bottom',
      copy: {
        en: {
          title: '📈 Click for Day Analytics',
          description:
            'Click any date to open the full day timeline: see peak hours, which appliance consumed the most, and the complete session receipt log.',
        },
        tl: {
          title: '📈 I-click para sa Day Analytics',
          description:
            'I-click ang anumang petsa para buksan ang full day timeline: makikita mo kung anong oras nag-peak ang kuryente, sinong appliance ang pinakamatakaw, at ang kumpletong session receipt log.',
        },
        taglish: {
          title: '📈 Click for Day Analytics',
          description:
            'I-click ang anumang petsa para buksan ang full day timeline: Makikita mo kung anong oras nag-peak ang kuryente, sinong appliance ang pinakamatakaw, at ang kumpletong log ng session receipts.',
        },
      },
    },
    {
      id: 'calendar-queue',
      placement: 'bottom',
      copy: {
        en: {
          title: '⏰ Upcoming Scheduled Tasks',
          description:
            'View the list of scheduled appliances set to trigger at specific times. Manage upcoming turn-on and turn-off tasks from here.',
        },
        tl: {
          title: '⏰ Mga Nakaiskedyul na Gawain',
          description:
            'Tingnan ang listahan ng mga naka-schedule na appliances na nakatakdang mag-trigger sa takdang oras.',
        },
        taglish: {
          title: '⏰ Upcoming Scheduled Tasks',
          description:
            'Tingnan ang listahan ng mga naka-schedule na appliances na nakatakdang mag-trigger sa takdang oras.',
        },
      },
    },
  ],
};

// ─── ANALYTICS ──────────────────────────────────────────────
const analyticsTour: PageTour = {
  pageName: 'analytics',
  pageTitle: {
    en: 'Analytics Tour',
    tl: 'Gabay sa Analytics',
    taglish: 'Analytics Tour',
  },
  steps: [
    {
      id: 'analytics-load-curve',
      placement: 'bottom',
      copy: {
        en: {
          title: '📉 24-Hour Diurnal Power Curve',
          description:
            'This area chart shows your power profile across 24 hours. See when your Peak Load (all appliances running simultaneously) and Off-Peak hours are.',
        },
        tl: {
          title: '📉 24-Oras na Diurnal Power Curve',
          description:
            'Ipinapakita ng area chart na ito ang profile ng kuryente mo sa loob ng 24 oras. Dito mo makikita kung kailan ang Peak Load (oras na sabay-sabay ang gamit) at Off-Peak hours.',
        },
        taglish: {
          title: '📉 24-Hour Diurnal Power Curve',
          description:
            'Ipinapakita ng area chart na ito ang profile ng kuryente mo sa loob ng 24 oras. Dito mo makikita kung kailan ang Peak Load (oras na sabay-sabay ang gamit) at Off-Peak hours.',
        },
      },
    },
    {
      id: 'analytics-time-presets',
      placement: 'bottom',
      copy: {
        en: {
          title: '🔍 Time Zoom Presets',
          description:
            'Select a zoom filter to isolate a specific part of the day (e.g. 12AM-8AM for sleep, 8AM-4PM for work/store, 4PM-12AM for evening).',
        },
        tl: {
          title: '🔍 Mga Time Zoom Preset',
          description:
            'Piliin ang zoom filter para ma-isolate ang partikular na bahagi ng araw (hal. 12AM-8AM para sa tulog, 8AM-4PM para sa work/tindahan, 4PM-12AM para sa gabi).',
        },
        taglish: {
          title: '🔍 Time Zoom Presets',
          description:
            'Piliin ang zoom filter para ma-isolate ang partikular na bahagi ng araw (hal. 12AM-8AM para sa tulog, 8AM-4PM para sa work/store, 4PM-12AM para sa gabi).',
        },
      },
    },
    {
      id: 'analytics-vampire-load',
      placement: 'bottom',
      copy: {
        en: {
          title: '🧛 Vampire Load (Standby Power)',
          description:
            'This is the consumption of appliances plugged in but on standby or off (chargers, microwave displays, TV standby). Unplugging these is the fastest way to cut your bill!',
        },
        tl: {
          title: '🧛 Vampire Load (Standby Power)',
          description:
            'Ito ang konsumo ng mga appliances na nakasaksak kahit naka-standby o naka-off (mga charger, microwave display, TV standby). Ang pag-unplug sa mga ito ay mabilisang bawas-bill!',
        },
        taglish: {
          title: '🧛 Vampire Load (Standby Power)',
          description:
            'Ito ang konsumo ng mga appliances na nakasaksak kahit naka-standby o naka-off (mga charger, microwave display, TV standby). Ang pag-unplug sa mga ito ay mabilisang bawas-bill!',
        },
      },
    },
    {
      id: 'analytics-category-bars',
      placement: 'top',
      copy: {
        en: {
          title: '🥧 Category Share & Cost Allocation',
          description:
            'Quick ranking of categories (Aircon vs Kitchen vs Laundry) and how much of your bill goes to each unbundled component.',
        },
        tl: {
          title: '🥧 Category Share at Cost Allocation',
          description:
            'Mabilisang ranking ng mga kategorya (Aircon vs Kitchen vs Laundry) at kung gaano kalaking porsyento ng iyong bayarin ang napupunta sa bawat unbundled component.',
        },
        taglish: {
          title: '🥧 Category Share & Cost Allocation',
          description:
            'Mabilisang ranking ng mga kategorya (Aircon vs Kitchen vs Laundry) at kung gaano kalaking porsyento ng iyong bayarin ang napupunta sa bawat unbundled component.',
        },
      },
    },
    {
      id: 'analytics-insights',
      placement: 'top',
      copy: {
        en: {
          title: '💡 AI Energy Recommendations',
          description:
            'The system automatically provides practical tips (e.g., shifting heavy laundry tasks to off-peak hours or adjusting aircon thermostat settings to save money).',
        },
        tl: {
          title: '💡 AI Energy Recommendations',
          description:
            'Awtomatikong nagbibigay ang system ng mga praktikal na payo (halimbawa: paglipat ng mabibigat na laundry tasks sa off-peak hours o pag-adjust ng aircon thermostat para makatipid).',
        },
        taglish: {
          title: '💡 AI Energy Recommendations',
          description:
            'Awtomatikong nagbibigay ang system ng mga praktikal na payo (halimbawa: paglipat ng mabibigat na laundry tasks sa off-peak hours o pag-adjust ng aircon thermostat para makatipid).',
        },
      },
    },
  ],
};

// ─── FORECASTING ────────────────────────────────────────────
const forecastingTour: PageTour = {
  pageName: 'forecasting',
  pageTitle: {
    en: 'Forecasting Tour',
    tl: 'Gabay sa Forecasting',
    taglish: 'Forecasting Tour',
  },
  steps: [
    {
      id: 'forecast-rate-slider',
      placement: 'bottom',
      copy: {
        en: {
          title: '🎚️ Meralco Rate Stress-Test',
          description:
            'What happens to your bill if the generation charge jumps by +₱1.50/kWh next month due to a WESM spike? Adjust the slider to see the impact on your budget.',
        },
        tl: {
          title: '🎚️ Meralco Rate Stress-Test',
          description:
            'Ano ang mangyayari sa bill mo kung tumaas ng +₱1.50/kWh ang generation charge sa susunod na buwan dahil sa WESM spike? I-adjust ang slider para makita ang epekto sa iyong budget.',
        },
        taglish: {
          title: '🎚️ Meralco Rate Stress-Test',
          description:
            'Ano ang mangyayari sa bill mo kung tumaas ng +₱1.50/kWh ang generation charge sa susunod na buwan dahil sa WESM spike? I-adjust ang slider para makita ang epekto sa iyong budget.',
        },
      },
    },
    {
      id: 'forecast-scenarios',
      placement: 'top',
      copy: {
        en: {
          title: '🎯 Baseline, Eco & Summer Scenarios',
          description:
            'Compare three scenarios: Baseline (current habits), Eco Mode (15% savings on cooling with ₱ equivalent), and Summer Heatwave (+25% surge due to extreme heat).',
        },
        tl: {
          title: '🎯 Baseline, Eco at Summer Scenarios',
          description:
            'Inihahambing ng card na ito ang tatlong sitwasyon: Baseline (kasalukuyang gawi), Eco Mode (15% tipid sa cooling na may katumbas na ₱ savings), at Summer Heatwave (+25% surge dahil sa matinding init).',
        },
        taglish: {
          title: '🎯 Baseline, Eco & Summer Scenarios',
          description:
            'Inihahambing ng card na ito ang tatlong sitwasyon: Baseline (kasalukuyang gawi), Eco Mode (15% tipid sa cooling na may katumbas na ₱ savings), at Summer Heatwave (+25% surge dahil sa matinding init).',
        },
      },
    },
    {
      id: 'forecast-space-tabs',
      placement: 'bottom',
      copy: {
        en: {
          title: '🏢 Forecast Scope Selector',
          description:
            'Choose which space to forecast: all spaces combined, or drill down into a specific residential or commercial sub-meter.',
        },
        tl: {
          title: '🏢 Forecast Scope Selector',
          description:
            'Piliin kung aling space ang i-forecast: lahat ng spaces na pinagsama, o mag-drill down sa isang partikular na residential o commercial sub-meter.',
        },
        taglish: {
          title: '🏢 Forecast Scope Selector',
          description:
            'Piliin kung aling space ang i-forecast: lahat ng spaces combined, o mag-drill down sa isang specific na residential o commercial sub-meter.',
        },
      },
    },
    {
      id: 'forecast-advisory',
      placement: 'top',
      copy: {
        en: {
          title: '🛡️ Tariff Pass-Through Advisory',
          description:
            'Read advisories about how the Philippine generation charge works as an automatic pass-through cost adjusted every billing cycle based on fuel costs and WESM spot market rates.',
        },
        tl: {
          title: '🛡️ Tariff Pass-Through Advisory',
          description:
            'Basahin ang mga advisory tungkol sa kung paano gumagana ang generation charge sa Pilipinas bilang automatic pass-through cost na ina-adjust bawat billing cycle base sa presyo ng fuel at WESM spot market rates.',
        },
        taglish: {
          title: '🛡️ Tariff Pass-Through Advisory',
          description:
            'Dito mo mababasa ang mga advisory tungkol sa kung paano gumagana ang Philippine generation charge bilang automatic pass-through cost na ina-adjust bawat billing cycle base sa fuel costs at WESM spot market rates.',
        },
      },
    },
  ],
};

// ─── EXPORT ALL TOURS ───────────────────────────────────────

export const ALL_TOURS: PageTour[] = [
  dashboardTour,
  calculatorTour,
  appliancesTour,
  calendarTour,
  analyticsTour,
  forecastingTour,
];

/**
 * Get tour steps for a specific page.
 * Matches by route path suffix: /dashboard → 'dashboard', /calculator → 'calculator', etc.
 */
export function getTourForPage(pathname: string): PageTour | null {
  const segment = pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
  return ALL_TOURS.find((t) => t.pageName === segment) || null;
}

/**
 * Map route pathnames to tour page names.
 */
export const ROUTE_TO_TOUR_PAGE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/calculator': 'calculator',
  '/appliances': 'appliances',
  '/calendar': 'calendar',
  '/analytics': 'analytics',
  '/forecasting': 'forecasting',
};
