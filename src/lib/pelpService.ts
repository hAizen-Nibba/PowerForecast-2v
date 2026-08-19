import { PelpCategory, PelpItem } from '../types';
import { devLog } from './devLogger';

export const PELP_CATEGORIES: PelpCategory[] = [
  { slug: 'air-conditioners', name: 'Air Conditioners', icon: 'Wind', count: 1787, file: '/pelp_data/parsed_json/air-conditioners.json' },
  { slug: 'refrigerating-appliances', name: 'Refrigerators & Freezers', icon: 'Refrigerator', count: 827, file: '/pelp_data/parsed_json/refrigerating-appliances.json' },
  { slug: 'television-sets', name: 'Television Sets', icon: 'Tv', count: 1320, file: '/pelp_data/parsed_json/television-sets.json' },
  { slug: 'electric-fans', name: 'Electric Fans', icon: 'Fan', count: 153, file: '/pelp_data/parsed_json/electric-fans.json' },
  { slug: 'clothes-washing-machines', name: 'Washing Machines', icon: 'Shirt', count: 10, file: '/pelp_data/parsed_json/clothes-washing-machines.json' },
  { slug: 'lighting-products', name: 'Lighting Products', icon: 'Lightbulb', count: 2722, file: '/pelp_data/parsed_json/lighting-products.json' },
];

const pelpCache: Record<string, PelpItem[]> = {};

function extractField(row: any, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  return '';
}

function extractNumber(row: any, keys: string[], defaultVal = 0): number {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) {
      const parsed = parseFloat(String(row[k]).replace(/[^0-9.-]+/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
  }
  return defaultVal;
}

export async function fetchPelpCategoryData(categorySlug: string): Promise<PelpItem[]> {
  if (pelpCache[categorySlug]) {
    return pelpCache[categorySlug];
  }

  const category = PELP_CATEGORIES.find(c => c.slug === categorySlug);
  if (!category) return [];

  try {
    devLog.info('PELP Database', `Loading official DOE dataset for [${category.name}]...`, { file: category.file, slug: categorySlug });
    const res = await fetch(category.file);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const rawList: any[] = Array.isArray(data) ? data : data.products || [];

    const items: PelpItem[] = rawList.map((row: any, idx: number) => {
      const controlNo = extractField(row, [
        'CONTROL NO.',
        'CONTROL NO',
        'control_no',
        'Control_No',
        'control_number',
      ]) || `PELP-${category.slug.substring(0, 3).toUpperCase()}-${idx + 1000}`;

      const brand = extractField(row, [
        'BRAND NAME',
        'BRAND',
        'brand',
        'Brand',
        'COMPANY',
        'company',
      ]) || 'Standard Brand';

      const model = extractField(row, [
        'MODEL NO./CODE',
        'MODEL NO.',
        'MODEL',
        'model',
        'model_number',
        'PRODUCT NAME',
      ]) || `Model-${idx + 1}`;

      const productName = extractField(row, [
        'PRODUCT NAME',
        'PRODUCT',
        'product_name',
        'INSTALLATION TYPE',
        'REFRIGERATOR TYPE',
        'TV TYPE',
      ]);

      const monthlyKwh = extractNumber(row, [
        'MONTHLY ENERGY ELECTRICITY CONSUMPTION (KWH)',
        'MONTHLY ESTIMATED ELECTRICITY CONSUMPTION (kWh)',
        'MONTHLY ESTIMATED ELECTRICITY CONSUMPTION (KWH)',
        'MONTHLY ENERGY CONSUMPTION (KWH)',
        'monthly_energy_consumption_kwh',
        'monthly_kwh',
      ], 0);

      let powerWatts = extractNumber(row, [
        'POWER RATING (WATTS)',
        'RATED POWER',
        'POWER RATING',
        'POWER (W)',
        'power_watts',
        'watts',
      ], 0);

      // If watts is missing or 0, intelligently compute from monthly kWh based on standard DOE test cycle
      if (powerWatts <= 0) {
        if (monthlyKwh > 0) {
          if (categorySlug === 'air-conditioners') {
            powerWatts = Math.round((monthlyKwh / (30 * 8)) * 1000); // 8h/day standard cycle
          } else if (categorySlug === 'refrigerating-appliances') {
            powerWatts = Math.round((monthlyKwh / (30 * 24)) * 1000 * 3.5); // duty cycle adjustment
          } else if (categorySlug === 'electric-fans') {
            powerWatts = Math.round((monthlyKwh / (30 * 8)) * 1000);
          } else if (categorySlug === 'television-sets') {
            powerWatts = Math.round((monthlyKwh / (30 * 5)) * 1000);
          } else if (categorySlug === 'clothes-washing-machines') {
            powerWatts = 500;
          } else {
            powerWatts = Math.round((monthlyKwh / (30 * 4)) * 1000);
          }
        } else {
          // Category default baseline
          if (categorySlug === 'air-conditioners') powerWatts = 950;
          else if (categorySlug === 'refrigerating-appliances') powerWatts = 160;
          else if (categorySlug === 'electric-fans') powerWatts = 55;
          else if (categorySlug === 'television-sets') powerWatts = 65;
          else if (categorySlug === 'clothes-washing-machines') powerWatts = 450;
          else if (categorySlug === 'lighting-products') powerWatts = 15;
          else powerWatts = 100;
        }
      }

      // Compute monthly kWh if missing
      const finalMonthlyKwh = monthlyKwh > 0 ? monthlyKwh : Math.round(((powerWatts * 8 * 30) / 1000) * 10) / 10;

      const starRatingRaw = extractNumber(row, [
        'ENERGY EFFICIENCY PERFORMANCE RATING',
        'STAR RATING',
        'star_rating',
        'stars',
      ], 0);
      const starRating = starRatingRaw > 0 ? Math.min(5, Math.max(1, Math.round(starRatingRaw))) : 5;

      const eerCspf = extractNumber(row, [
        'ENERGY EFFICIENCY RATING (CSPF)',
        'ENERGY EFFICIENCY FACTOR (EEF)',
        'ENERGY EFFICIENCY RATING (EER)',
        'CSPF',
        'EEF',
        'EER',
      ], 0);

      // Extract specific extra specs per category
      let extraSpec = '';
      if (categorySlug === 'air-conditioners') {
        const capacity = extractField(row, ['COOLING CAPACITY (KW)', 'COOLING CAPACITY']);
        const type = extractField(row, ['INSTALLATION TYPE']);
        if (capacity) extraSpec = `${capacity} kW (${type || 'Split/Window'})`;
      } else if (categorySlug === 'refrigerating-appliances') {
        const vol = extractField(row, ['VOLUME (Liters)', 'VOLUME']);
        const type = extractField(row, ['REFRIGERATOR TYPE']);
        if (vol) extraSpec = `${vol} Liters (${type || 'Refrigerator'})`;
      } else if (categorySlug === 'television-sets') {
        const size = extractField(row, ['SCREEN SIZE (INCHES)', 'SCREEN SIZE']);
        const type = extractField(row, ['TV TYPE']);
        if (size) extraSpec = `${size}" (${type || 'Display'})`;
      } else if (categorySlug === 'electric-fans') {
        const flow = extractField(row, ['MAXIMUM FAN FLOW RATE']);
        if (flow) extraSpec = `Flow: ${flow} m³/min`;
      } else if (categorySlug === 'clothes-washing-machines') {
        const cap = extractField(row, ['CAPACITY (KG)']);
        if (cap) extraSpec = `${cap} kg Capacity`;
      } else if (categorySlug === 'lighting-products') {
        const lumens = extractField(row, ['LIGHT OUTPUT (LM)', 'LUMENS']);
        if (lumens) extraSpec = `${lumens} Lumens`;
      }

      return {
        control_no: controlNo,
        brand: brand,
        model: model,
        category: category.name,
        category_slug: category.slug,
        type: productName || extraSpec,
        monthly_energy_consumption_kwh: Math.round(finalMonthlyKwh * 10) / 10,
        cspf: eerCspf > 0 ? eerCspf : undefined,
        energy_efficiency_rating: eerCspf > 0 ? eerCspf : undefined,
        star_rating: starRating,
        power_watts: Math.max(1, Math.round(powerWatts)),
        raw_specs: {
          ...row,
          _extraSpec: extraSpec,
        },
      };
    });

    pelpCache[categorySlug] = items;
    return items;
  } catch (error) {
    console.warn(`Failed to fetch PELP data for ${categorySlug}:`, error);
    return [];
  }
}

export async function searchPelpDatabase(query: string, categorySlug?: string): Promise<PelpItem[]> {
  const q = query.toLowerCase().trim();
  const categoriesToSearch = categorySlug && categorySlug !== 'all'
    ? [categorySlug]
    : PELP_CATEGORIES.map(c => c.slug);

  const results: PelpItem[] = [];

  const startTime = Date.now();
  for (const cat of categoriesToSearch) {
    const items = await fetchPelpCategoryData(cat);
    if (!q) {
      results.push(...items.slice(0, 50));
      continue;
    }

    const filtered = items.filter(item =>
      item.brand.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q) ||
      item.control_no.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q) ||
      (item.raw_specs?.COMPANY && String(item.raw_specs.COMPANY).toLowerCase().includes(q))
    );
    results.push(...filtered.slice(0, 100));
  }

  const durationMs = Date.now() - startTime;
  if (q) {
    devLog.api('PELP Database', `DOE Search query "${q}" returned ${results.length} certified units (${durationMs}ms)`, {
      query: q,
      resultsCount: results.length,
      categoryFilter: categorySlug || 'all',
    }, durationMs);
  }

  return results;
}
