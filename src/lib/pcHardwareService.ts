import { CpuHardwareItem, GpuHardwareItem } from "../types";
import { devLog } from "./devLogger";

let cachedCpus: CpuHardwareItem[] | null = null;
let cachedGpus: GpuHardwareItem[] | null = null;

/**
 * Loads the curated CPU catalog from public/pc_data/cpus.json
 */
export async function fetchCpuCatalog(): Promise<CpuHardwareItem[]> {
  if (cachedCpus) return cachedCpus;
  try {
    const res = await fetch("/pc_data/cpus.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedCpus = data;
    return data;
  } catch (err) {
    devLog.warn("PCHardwareService", "Failed to load cpus.json, using fallback", { error: err });
    return [
      { id: "generic-amd-ryzen-5", name: "AMD Ryzen 5 (Mainstream 6-Core)", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 60, idle_w: 14 },
      { id: "generic-intel-i5", name: "Intel Core i5 (Mainstream)", brand: "Intel", family: "Core i5", tdp: 65, gaming_w: 65, idle_w: 14 },
      { id: "generic-amd-ryzen-7", name: "AMD Ryzen 7 (Performance 8-Core)", brand: "AMD", family: "Ryzen 7", tdp: 105, gaming_w: 80, idle_w: 16 },
      { id: "generic-intel-i7", name: "Intel Core i7 (High-End)", brand: "Intel", family: "Core i7", tdp: 125, gaming_w: 125, idle_w: 18 },
      { id: "generic-office-cpu", name: "Basic Office CPU (Core i3 / Ryzen 3)", brand: "Generic", family: "Office", tdp: 55, gaming_w: 40, idle_w: 10 },
    ];
  }
}

/**
 * Loads the curated GPU catalog from public/pc_data/gpus.json
 */
export async function fetchGpuCatalog(): Promise<GpuHardwareItem[]> {
  if (cachedGpus) return cachedGpus;
  try {
    const res = await fetch("/pc_data/gpus.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cachedGpus = data;
    return data;
  } catch (err) {
    devLog.warn("PCHardwareService", "Failed to load gpus.json, using fallback", { error: err });
    return [
      { id: "integrated-graphics", name: "Integrated Graphics (No Dedicated GPU)", brand: "None", series: "Integrated", tgp: 0, gaming_w: 0, idle_w: 0 },
      { id: "generic-gtx-1650", name: "Entry Gaming (GTX 1650 / RX 6400)", brand: "NVIDIA", series: "Entry", tgp: 75, gaming_w: 70, idle_w: 8 },
      { id: "generic-rtx-3060", name: "Mid-Range Gaming (RTX 3060 / 4060 / RX 6600)", brand: "NVIDIA", series: "Mainstream", tgp: 160, gaming_w: 150, idle_w: 12 },
      { id: "generic-rtx-3070", name: "High-End Gaming (RTX 3070 / 4070 / RX 7800)", brand: "NVIDIA", series: "Performance", tgp: 220, gaming_w: 215, idle_w: 15 },
      { id: "generic-rtx-4080", name: "Enthusiast Flagship (RTX 4080 / 4090)", brand: "NVIDIA", series: "Enthusiast", tgp: 350, gaming_w: 320, idle_w: 22 },
    ];
  }
}

/**
 * Fast client-side fuzzy search for CPUs
 */
export function searchCpus(query: string, cpus: CpuHardwareItem[]): CpuHardwareItem[] {
  if (!query || !query.trim()) return cpus.slice(0, 30);
  const q = query.toLowerCase().replace(/\s+/g, "");
  return cpus
    .filter((c) => {
      const target = `${c.name} ${c.brand} ${c.family}`.toLowerCase().replace(/\s+/g, "");
      return target.includes(q);
    })
    .slice(0, 30);
}

/**
 * Fast client-side fuzzy search for GPUs
 */
export function searchGpus(query: string, gpus: GpuHardwareItem[]): GpuHardwareItem[] {
  if (!query || !query.trim()) return gpus.slice(0, 30);
  const q = query.toLowerCase().replace(/\s+/g, "");
  return gpus
    .filter((g) => {
      const target = `${g.name} ${g.brand} ${g.series}`.toLowerCase().replace(/\s+/g, "");
      return target.includes(q);
    })
    .slice(0, 30);
}

export type PcWorkloadProfile = "light" | "standard" | "heavy";

export interface DesktopPowerCalculationResult {
  baselineWatts: number;
  cpuWatts: number;
  gpuWatts: number;
  monitorWatts: number;
  totalRunningWatts: number;
  peakSystemWatts: number;
}

/**
 * Computes realistic active running wattage for a Desktop PC based on CPU, GPU, Monitors, and Workload Profile.
 */
export function calculateDesktopPcWatts(
  cpu: CpuHardwareItem | null,
  gpu: GpuHardwareItem | null,
  monitorCount: number = 1,
  workload: PcWorkloadProfile = "standard",
  customCpuTdp?: number,
  customGpuTgp?: number
): DesktopPowerCalculationResult {
  const cpuTdp = customCpuTdp !== undefined && customCpuTdp > 0 ? customCpuTdp : (cpu?.tdp || 65);
  const gpuTgp = customGpuTgp !== undefined && customGpuTgp >= 0 ? customGpuTgp : (gpu?.tgp ?? 160);

  // Baseline motherboard, RAM, NVMe SSD, and 3-4 RGB case fans
  const baselineWatts = workload === "light" ? 40 : workload === "standard" ? 48 : 55;

  let cpuWatts = 0;
  if (workload === "light") {
    cpuWatts = Math.max(cpu?.idle_w || 12, Math.round(cpuTdp * 0.22));
  } else if (workload === "standard") {
    cpuWatts = Math.round(cpuTdp * 0.50);
  } else {
    cpuWatts = cpu?.gaming_w || Math.round(cpuTdp * 0.85);
  }

  let gpuWatts = 0;
  if (gpuTgp === 0) {
    // Integrated graphics
    gpuWatts = 0;
  } else if (workload === "light") {
    gpuWatts = gpu?.idle_w || 12;
  } else if (workload === "standard") {
    gpuWatts = Math.round(gpuTgp * 0.25);
  } else {
    gpuWatts = gpu?.gaming_w || Math.round(gpuTgp * 0.90);
  }

  // Monitor draw: 1080p-1440p monitors draw ~28W-35W each
  const singleMonitorWatt = workload === "heavy" ? 35 : 28;
  const monitorWatts = Math.max(0, monitorCount) * singleMonitorWatt;

  const totalRunningWatts = baselineWatts + cpuWatts + gpuWatts + monitorWatts;
  const peakSystemWatts = cpuTdp + gpuTgp + 55 + monitorWatts;

  return {
    baselineWatts,
    cpuWatts,
    gpuWatts,
    monitorWatts,
    totalRunningWatts,
    peakSystemWatts,
  };
}

/**
 * Computes Laptop running wattage from charger peak wattage and workload
 */
export function calculateLaptopRunningWatts(
  chargerWatts: number,
  workload: PcWorkloadProfile = "standard"
): number {
  const factor = workload === "light" ? 0.25 : workload === "standard" ? 0.45 : 0.80;
  return Math.max(10, Math.round(chargerWatts * factor));
}

export interface AiPcResolutionResult {
  cpu_name?: string;
  cpu_tdp?: number;
  gpu_name?: string;
  gpu_tgp?: number;
  monitors?: number;
  device_type: "desktop_pc" | "laptop";
  total_estimated_running_watts: number;
  explanation: string;
}

/**
 * Fallback to Google Gemini AI to resolve obscure hardware or freeform text queries
 */
export async function resolvePcHwWithAi(
  query: string,
  apiKey?: string
): Promise<AiPcResolutionResult> {
  const effectiveKey =
    apiKey ||
    localStorage.getItem("powerforecast_gemini_api_key") ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    "";

  if (!effectiveKey.trim()) {
    throw new Error("Gemini API key is required to query AI hardware specifications.");
  }

  const prompt = `You are a PC hardware and electrical engineering expert. Analyze the following computer specification, laptop model, or hardware query:
"${query}"

Determine whether it is a Desktop PC or a Laptop.
Extract:
- cpu_name (e.g. AMD Ryzen 5 5600, Intel Core i5-12400)
- cpu_tdp (in Watts)
- gpu_name (e.g. NVIDIA GeForce RTX 3060 12GB, or "Integrated Graphics")
- gpu_tgp (in Watts; 0 if integrated)
- monitors (default 1)
- device_type ("desktop_pc" or "laptop")
- total_estimated_running_watts (realistic active power draw under typical gaming or standard work, NOT PSU capacity!)
- explanation (short 1 sentence in English)

Return ONLY valid JSON matching this exact structure:
{
  "device_type": "desktop_pc",
  "cpu_name": "...",
  "cpu_tdp": 65,
  "gpu_name": "...",
  "gpu_tgp": 170,
  "monitors": 1,
  "total_estimated_running_watts": 285,
  "explanation": "..."
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${effectiveKey.trim()}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const jsonMatch = textOutput.match(/```json\s*([\s\S]*?)\s*```/) || textOutput.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Could not parse AI response.");
  }

  return JSON.parse(jsonMatch[1] || jsonMatch[0]);
}
