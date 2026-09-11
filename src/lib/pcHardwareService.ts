import { CpuHardwareItem, GpuHardwareItem } from "../types";
import { devLog } from "./devLogger";
import { CPU_CATALOG, GPU_CATALOG } from "./pcHardwareData";

/**
 * Loads the curated CPU catalog
 */
export async function fetchCpuCatalog(): Promise<CpuHardwareItem[]> {
  return CPU_CATALOG;
}

/**
 * Loads the curated GPU catalog
 */
export async function fetchGpuCatalog(): Promise<GpuHardwareItem[]> {
  return GPU_CATALOG;
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
