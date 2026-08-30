import { VisionScanResult } from '../types';
import { devLog } from './devLogger';

export interface ImageItem {
  id: string;
  base64: string;
  file?: File;
  name?: string;
}

export interface MultiScanOptions {
  images: ImageItem[];
  apiKey?: string;
  preset?: 'energy_guide' | 'nameplate' | 'inverter_check';
}

export function sanitizeAndReconcileSpecs(d: any): {
  watts: number;
  monthlyKwh: number;
  category: string;
  voltage: number;
  starRating: number;
  isInverter: boolean;
  coolingCapacityKjH?: number;
  coolingCapacityBtu?: number;
  cspf?: number;
  eer?: number;
  currentAmps?: number;
} {
  let cat = String(d.category || 'Other').trim();
  // Normalize categories to standard PowerForecast catalog
  if (/fan/i.test(cat)) cat = 'Electric Fans';
  else if (/condition|aircon|split|window/i.test(cat)) cat = 'Air Conditioners';
  else if (/refrig|freezer|chiller/i.test(cat)) cat = 'Refrigerators & Freezers';
  else if (/tv|television|screen|display/i.test(cat)) cat = 'Television Sets';
  else if (/wash|dryer|laundry/i.test(cat)) cat = 'Clothes Washing Machines';
  else if (/light|lamp|bulb|led/i.test(cat)) cat = 'Lighting Products';
  else if (/cook|rice|microwave|oven|blender|kettle|air\s*fry/i.test(cat)) cat = 'Kitchen Appliances';
  else if (/water|heater|shower|pump/i.test(cat)) cat = 'Water Heaters & Pumps';
  else if (/computer|pc|laptop|printer|monitor/i.test(cat)) cat = 'Computers & Office';

  const isInverter = Boolean(
    d.is_inverter === true ||
    /inverter/i.test(d.energy_rating || '') ||
    /inverter/i.test(d.notes || '') ||
    /inverter/i.test(d.model || '')
  );

  let rawWatts = Number(d.power_watts || d.watts || 0);
  const voltage = Number(d.voltage) || 230;
  const currentAmps = Number(d.current_amps || d.amps || 0);

  // If power_watts is missing or 0, compute from Voltage x Current x Power Factor
  if ((!rawWatts || rawWatts <= 0) && currentAmps > 0) {
    const pf = cat.includes('Air Condition') || cat.includes('Refrigerat') ? 0.9 : 0.95;
    rawWatts = Math.round(voltage * currentAmps * pf);
  }

  // Unit disambiguation & physical sanity clamps
  if (cat.includes('Air Condition')) {
    // If rawWatts > 4000, model likely read cooling capacity in kJ/h or BTU/h by mistake
    if (rawWatts > 4000) {
      if (rawWatts >= 7000 && rawWatts <= 28000) {
        // kJ/h or BTU/h conversion estimate: thermal capacity / ~10.5 average EER
        rawWatts = Math.round(rawWatts / 10.5);
      } else {
        rawWatts = 950;
      }
    } else if (rawWatts < 250) {
      rawWatts = 850;
    }
  } else if (cat.includes('Electric Fan')) {
    if (rawWatts > 250 || rawWatts < 15) rawWatts = 70;
  } else if (cat.includes('Television')) {
    if (rawWatts > 500 || rawWatts < 15) rawWatts = 75;
  } else if (cat.includes('Refrigerat')) {
    if (rawWatts > 600 || rawWatts < 20) rawWatts = isInverter ? 95 : 130;
  } else if (cat.includes('Clothes Washing')) {
    if (rawWatts > 2500 || rawWatts < 50) rawWatts = 450;
  }

  if (!rawWatts || rawWatts <= 0) rawWatts = 100;

  // Monthly kWh calculation
  let monthlyKwh = Number(d.monthly_kwh);
  if (!monthlyKwh || monthlyKwh <= 0) {
    if (cat.includes('Refrigerat')) {
      const duty = isInverter ? 0.30 : 0.40;
      monthlyKwh = Math.round(((rawWatts * 24 * duty * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Air Condition')) {
      const duty = isInverter ? 0.65 : 0.85;
      monthlyKwh = Math.round(((rawWatts * 8 * duty * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Fan')) {
      monthlyKwh = Math.round(((rawWatts * 10 * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Television')) {
      monthlyKwh = Math.round(((rawWatts * 5 * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Washing')) {
      monthlyKwh = Math.round(((rawWatts * 1 * 15) / 1000) * 10) / 10;
    } else {
      monthlyKwh = Math.round(((rawWatts * 6 * 30) / 1000) * 10) / 10;
    }
  }

  let starRating = Number(d.star_rating);
  if (!starRating || starRating < 1 || starRating > 5) {
    starRating = isInverter ? 5 : 4;
  }

  return {
    watts: rawWatts,
    monthlyKwh,
    category: cat,
    voltage,
    starRating,
    isInverter,
    coolingCapacityKjH: Number(d.cooling_capacity_kj_h) || undefined,
    coolingCapacityBtu: Number(d.cooling_capacity_btu) || undefined,
    cspf: Number(d.cspf) || undefined,
    eer: Number(d.eer || d.cspf_or_eer) || undefined,
    currentAmps: currentAmps > 0 ? currentAmps : undefined,
  };
}

export function buildVisionPrompt(preset: string, imageCount: number): string {
  const multiNotice =
    imageCount > 1
      ? `\nNOTE: The user provided ${imageCount} multi-angle photos (e.g. Energy Guide yellow label, technical nameplate, and full appliance body). Cross-reference all ${imageCount} images to extract the most accurate brand, model, rated electrical wattage, voltage, and energy rating.\n`
      : '';

  return `You are ApplianceSpec AI, an elite electrical engineer and energy auditor specializing in Philippine Department of Energy (DOE) PELP standards, Energy Guide yellow labels, and electrical appliance specification nameplates (e.g. Carrier, Condura, Panasonic, LG, Samsung, Sharp, Daikin, Asahi, Astron, Standard, Hanabishi, TCL, Midea, Kolin, Haier, etc.).${multiNotice}

Examine all uploaded appliance photo(s). Extract real, high-precision technical data visible across the image(s) following these strict engineering rules:

### 1. POWER & UNIT DISAMBIGUATION (CRITICAL)
- DO NOT confuse Cooling Capacity (kJ/h, BTU/h, HP, or cooling kW) with Electrical Power Input (Watts).
  * If the label shows "Cooling Capacity: 9500 kJ/h" or "10,000 BTU/h", that is THERMAL capacity, NOT electric power consumption.
  * Look for "Rated Power Input (W)", "Power Consumption (W)", "Input (W)", "Total Input (W)", or "Rated Input".
  * If electric power (Watts) is not explicitly printed, calculate: Power (W) = Voltage (V) × Current (A) × Power Factor (0.9 for motors/compressors, 1.0 for heaters). Example: 230V × 3.8A × 0.9 ≈ 786W.
  * Realistic electric input wattage ranges for Philippine residential units:
    - Air Conditioners (Window/Split): 450W - 2200W (NEVER 5000W - 18000W; values >3500W indicate thermal kJ/h or BTU was misread!)
    - Refrigerators & Freezers: 60W - 250W
    - Electric Fans (Desk/Stand/Ceiling/Orbit): 35W - 110W
    - Television Sets (32"-75" LED/OLED): 30W - 180W
    - Clothes Washing Machines: 250W - 650W (Motor/Spin), 1200W-2000W (Heater if present)

### 2. PHILIPPINE DOE ENERGY GUIDE & PELP EXTRACTION
- Look for the yellow Philippine DOE Energy Guide label:
  * Extract exact "Monthly Energy Consumption: [X] kWh/month" directly from the yellow label test result box.
  * Extract Star Rating (1 to 5 stars displayed on the top yellow banner).
  * Extract CSPF (Cooling Seasonal Performance Factor) or EER (Energy Efficiency Ratio) if visible.

### 3. TECHNOLOGY & INVERTER DETECTION
- Check if the appliance has Inverter technology ("Inverter", "Dual Inverter", "DC Inverter", "Digital Inverter", "Smart Inverter", "Direct Drive Inverter"). Set "is_inverter": true if detected.

### 4. CATEGORY NORMALIZATION
Categorize strictly as one of:
- "Air Conditioners"
- "Refrigerators & Freezers"
- "Television Sets"
- "Electric Fans"
- "Clothes Washing Machines"
- "Lighting Products"
- "Kitchen Appliances"
- "Water Heaters & Pumps"
- "Computers & Office"
- "Other"

### 5. PRESET MODE
Current analysis preset: ${preset} (Modes: 'energy_guide' prioritizes yellow DOE labels and monthly kWh; 'nameplate' prioritizes electrical rating plates; 'inverter_check' prioritizes motor/compressor efficiency).

Respond ONLY with a valid JSON object inside a \`\`\`json block with these keys:
{
  "brand": "Exact brand string (e.g. Astron, Standard, Asahi, Carrier, Panasonic, LG, Sharp, Daikin, Samsung, Condura, etc.)",
  "model": "Exact model number/code visible on label (e.g. WCONX008EEV, BRONCO 18, etc.)",
  "category": "Standard category name from list above",
  "power_watts": number (e.g. 70 for fan, 850 for AC, 110 for refrigerator),
  "voltage": number (e.g. 230),
  "current_amps": number or null,
  "is_inverter": boolean,
  "cooling_capacity_kj_h": number or null,
  "cooling_capacity_btu": number or null,
  "cspf": number or null,
  "eer": number or null,
  "monthly_kwh": number (e.g. 16.8 for fan @ 10h/day, 160 for 850W inverter AC @ 8h/day, 28 for inverter refrigerator),
  "energy_rating": "e.g. 5-Star DOE Certified, Inverter, CSPF 5.85, or PS Mark",
  "star_rating": number between 1 and 5,
  "room_location": "Living Room | Master Bedroom | Kitchen | Laundry Area | Home Office",
  "confidence": "high | medium | low",
  "notes": "Detailed engineering audit notes: detected rated power, voltage, current, frequency (60Hz), serial number, PELP registration, and energy efficiency summary."
}`;
}

export async function analyzeMultipleApplianceImages(options: MultiScanOptions): Promise<VisionScanResult> {
  const { images, apiKey, preset = 'energy_guide' } = options;
  if (!images || images.length === 0) {
    devLog.error('AI Scanner', 'Analysis failed: No images provided.');
    throw new Error('No images provided for analysis.');
  }

  devLog.info('AI Scanner', `Initiating Google Gemini Multimodal AI Analysis (${images.length} photo(s))`, {
    photoCount: images.length,
    preset,
    files: images.map((i) => i.name || 'Appliance photo'),
  });

  let serverlessError: string | null = null;

  // 1. First Priority: Vercel Serverless /api/analyze Endpoint
  try {
    const formattedImages = images.slice(0, 3).map((img) => ({
      base64: img.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, ''),
      mimeType: 'image/jpeg',
    }));

    devLog.info('AI Scanner', 'Routing image payload to Vercel Serverless API (/api/analyze)...');
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: formattedImages,
        preset,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && (json.data.brand || json.data.model || json.data.power_watts || json.data.watts)) {
        const reconciled = sanitizeAndReconcileSpecs(json.data);

        devLog.success('AI Scanner', `Vercel Serverless Gemini AI extracted specs successfully`, {
          model: json.model_used || 'gemini-2.0-flash',
          extracted: json.data,
          reconciled,
        });

        return {
          detected_brand: json.data.brand || 'Detected Brand',
          detected_model: json.data.model || 'Standard Unit',
          detected_category: reconciled.category,
          detected_watts: reconciled.watts,
          detected_voltage: reconciled.voltage,
          detected_monthly_kwh: reconciled.monthlyKwh,
          detected_energy_rating: json.data.energy_rating || (reconciled.isInverter ? 'Inverter Energy Certified' : 'DOE Energy Certified'),
          detected_star_rating: reconciled.starRating,
          is_inverter: reconciled.isInverter,
          cooling_capacity_kj_h: reconciled.coolingCapacityKjH,
          cooling_capacity_btu: reconciled.coolingCapacityBtu,
          cspf: reconciled.cspf,
          eer: reconciled.eer,
          rated_current_amps: reconciled.currentAmps,
          confidence: (json.data.confidence as any) || 'high',
          raw_markdown: json.data.notes || json.raw_markdown || 'Analyzed via Google Gemini AI',
        };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      serverlessError = errData.error || `Serverless returned HTTP ${res.status}`;
      devLog.warn('AI Scanner', `Vercel serverless /api/analyze unavailable: ${serverlessError}`);
    }
  } catch (err: any) {
    serverlessError = err.message;
    devLog.warn('AI Scanner', `Serverless endpoint not reachable (${err.message}). Checking client Gemini key...`);
  }

  // 2. Second Priority: Direct Google Gemini Multimodal Vision API (Client Key / Local Dev)
  const effectiveKey =
    apiKey ||
    localStorage.getItem('powerforecast_gemini_api_key') ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    '';

  if (effectiveKey.trim()) {
    try {
      devLog.info('AI Scanner', 'Calling Google Gemini Multimodal Vision API directly...');
      return await callGeminiMultiVision(images, effectiveKey.trim(), preset);
    } catch (err: any) {
      devLog.error('AI Scanner', `Direct Google Gemini API call failed: ${err.message}`, { error: err });
      throw new Error(`Google Gemini Vision AI Error: ${err.message}`);
    }
  }

  // 3. Strict Pure AI: Fail explicitly if neither cloud service is configured (Zero Local OCR Guessing)
  const failureReason = serverlessError
    ? `Vercel Serverless Error: ${serverlessError}.`
    : 'No Gemini API key found on Vercel or locally.';

  throw new Error(
    `${failureReason} Please ensure GEMINI_API_KEY is configured in your Vercel Environment Variables or provide a Gemini API Key in the scanner settings.`
  );
}

async function callGeminiMultiVision(
  images: ImageItem[],
  apiKey: string,
  preset: string
): Promise<VisionScanResult> {
  const parts: any[] = [];

  // Add all images (up to 3) as inline_data
  images.slice(0, 3).forEach((img) => {
    const cleanBase64 = img.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: cleanBase64,
      },
    });
  });

  const prompt = buildVisionPrompt(preset, images.length);
  parts.push({ text: prompt });

  const modelsToTry = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-3.7-flash',
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    const startTime = Date.now();
    try {
      devLog.api('AI Scanner', `Sending multimodal payload to Google Gemini API [${model}]`, {
        model,
        photoCount: images.length,
        preset,
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: parts,
          },
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: 'application/json',
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        devLog.warn('AI Scanner', `Gemini model ${model} returned HTTP ${res.status}: ${errJson.error?.message || 'Error'}`, { error: errJson });
        throw new Error(errJson.error?.message || `HTTP ${res.status}`);
      }

      const resData = await res.json();
      const textOutput = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = textOutput.match(/```json\s*([\s\S]*?)\s*```/) || textOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        const reconciled = sanitizeAndReconcileSpecs(parsed);

        devLog.success('AI Scanner', `Gemini Multimodal Vision successfully extracted specs (${durationMs}ms)`, {
          model,
          durationMs,
          extracted: parsed,
          reconciled,
        }, durationMs);

        return {
          detected_brand: parsed.brand || 'Detected Appliance',
          detected_model: parsed.model || 'Standard Unit',
          detected_category: reconciled.category,
          detected_watts: reconciled.watts,
          detected_voltage: reconciled.voltage,
          detected_monthly_kwh: reconciled.monthlyKwh,
          detected_energy_rating: parsed.energy_rating || (reconciled.isInverter ? 'Inverter Energy Certified' : 'DOE Certified'),
          detected_star_rating: reconciled.starRating,
          is_inverter: reconciled.isInverter,
          cooling_capacity_kj_h: reconciled.coolingCapacityKjH,
          cooling_capacity_btu: reconciled.coolingCapacityBtu,
          cspf: reconciled.cspf,
          eer: reconciled.eer,
          rated_current_amps: reconciled.currentAmps,
          confidence: (parsed.confidence as any) || 'high',
          raw_markdown: parsed.notes || textOutput,
        };
      }
    } catch (e: any) {
      lastError = e;
    }
  }

  throw lastError || new Error('Failed to parse Google Gemini AI response');
}

