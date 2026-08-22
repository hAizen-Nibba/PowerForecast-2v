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
        const d = json.data;
        const watts = Number(d.power_watts || d.watts) || 100;
        const cat = d.category || 'Electric Fans';
        let monthlyKwh = Number(d.monthly_kwh);
        if (!monthlyKwh || monthlyKwh <= 0) {
          const hours = cat.includes('Refrigerat') ? 24 * 0.35 : cat.includes('Fan') ? 8 : cat.includes('Television') ? 5 : 8;
          monthlyKwh = Math.round(((watts * hours * 30) / 1000) * 10) / 10;
        }

        devLog.success('AI Scanner', `Vercel Serverless Gemini AI extracted specs successfully`, {
          model: json.model_used || 'gemini-2.0-flash',
          extracted: d,
        });

        return {
          detected_brand: d.brand || 'Detected Brand',
          detected_model: d.model || 'Standard Unit',
          detected_category: cat,
          detected_watts: watts,
          detected_voltage: Number(d.voltage) || 230,
          detected_monthly_kwh: monthlyKwh,
          detected_energy_rating: d.energy_rating || 'DOE Energy Certified',
          detected_star_rating: Number(d.star_rating) || 5,
          confidence: (d.confidence as any) || 'high',
          raw_markdown: d.notes || json.raw_markdown || 'Analyzed via Google Gemini AI',
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

  const multiNotice =
    images.length > 1
      ? `\n\nNOTE: The user has uploaded ${images.length} multi-angle photos of this appliance (e.g. Energy Guide label, manufacturer nameplate, and full appliance body). Cross-reference and reconcile data across all ${images.length} images to extract the most accurate brand, model, rated wattage, voltage, and energy metrics.`
      : '';

  const prompt = `You are ApplianceSpec AI, an expert mechanical and electrical engineer specialized in Philippine energy labels (DOE Energy Guide), technical nameplates (e.g. Astron, Standard, Asahi, Carrier, Panasonic, Sharp, etc.), and appliance specifications.${multiNotice}

Examine all uploaded appliance photo(s). Extract real technical data visible across the image(s).
Accurately identify the equipment category (e.g. If the photo shows or mentions STAND FAN, DESK FAN, ORBIT FAN, or electric fan blades/motor, categorize as "Electric Fans"; if it mentions Air Conditioner / Split / Window, categorize as "Air Conditioners"; if Refrigerator / Freezer, categorize as "Refrigerators & Freezers").

Respond ONLY with a JSON object inside a \`\`\`json block with these keys:
{
  "brand": "Exact brand string (e.g. Astron, Standard, Asahi, Carrier, Panasonic, LG, Sharp, Daikin, Samsung, Condura, etc.)",
  "model": "Exact model number/code visible on label (e.g. BRONCO 18, BR-000993, etc.)",
  "category": "Air Conditioners | Refrigerators & Freezers | Television Sets | Electric Fans | Clothes Washing Machines | Lighting Products | Other",
  "watts": number (e.g. 70 for 70W fan, 1050 for AC, 120 for Ref),
  "voltage": number (e.g. 230),
  "monthly_kwh": number (e.g. 16.8 for 70W fan @ 8h/day, 240 for 1000W AC),
  "energy_rating": "e.g. 5-Star DOE or PS Quality Mark (License No. Q-4141) or Inverter",
  "star_rating": number between 1 and 5,
  "room_location": "Living Room | Master Bedroom | Kitchen | Laundry Area | Home Office",
  "confidence": "high | medium | low",
  "notes": "Detailed bulleted list of all electrical specs, model name, wattage, voltage, serial numbers, date, license numbers read from label(s)."
}
Preset mode: ${preset}`;

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
        const cat = parsed.category || 'Electric Fans';
        const watts = Number(parsed.watts) || (cat.includes('Fan') ? 70 : 800);
        let monthlyKwh = Number(parsed.monthly_kwh);
        if (!monthlyKwh) {
          const hours = cat.includes('Refrigerat') ? 24 * 0.35 : cat.includes('Fan') ? 8 : cat.includes('Television') ? 5 : 8;
          monthlyKwh = Math.round(((watts * hours * 30) / 1000) * 10) / 10;
        }

        devLog.success('AI Scanner', `Gemini Multimodal Vision successfully extracted specs (${durationMs}ms)`, {
          model,
          durationMs,
          extracted: {
            brand: parsed.brand,
            model: parsed.model,
            category: cat,
            watts,
            monthly_kwh: monthlyKwh,
            energy_rating: parsed.energy_rating,
          },
        }, durationMs);

        return {
          detected_brand: parsed.brand || 'Detected Appliance',
          detected_model: parsed.model || 'Standard Unit',
          detected_category: cat,
          detected_watts: watts,
          detected_voltage: Number(parsed.voltage) || 230,
          detected_monthly_kwh: monthlyKwh,
          detected_energy_rating: parsed.energy_rating || 'DOE Certified',
          detected_star_rating: Number(parsed.star_rating) || 5,
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
