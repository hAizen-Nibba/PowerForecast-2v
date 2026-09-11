import { CpuHardwareItem, GpuHardwareItem } from "../types";

export const CPU_CATALOG: CpuHardwareItem[] = [
  // AMD Ryzen 9000 Series (Zen 5)
  { id: "amd-ryzen-9-9950x", name: "AMD Ryzen 9 9950X", brand: "AMD", family: "Ryzen 9", tdp: 170, gaming_w: 140, idle_w: 22 },
  { id: "amd-ryzen-9-9900x", name: "AMD Ryzen 9 9900X", brand: "AMD", family: "Ryzen 9", tdp: 120, gaming_w: 105, idle_w: 20 },
  { id: "amd-ryzen-7-9700x", name: "AMD Ryzen 7 9700X", brand: "AMD", family: "Ryzen 7", tdp: 65, gaming_w: 65, idle_w: 15 },
  { id: "amd-ryzen-5-9600x", name: "AMD Ryzen 5 9600X", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 58, idle_w: 14 },

  // AMD Ryzen 7000 Series (Zen 4)
  { id: "amd-ryzen-9-7950x3d", name: "AMD Ryzen 9 7950X3D", brand: "AMD", family: "Ryzen 9", tdp: 120, gaming_w: 90, idle_w: 18 },
  { id: "amd-ryzen-9-7950x", name: "AMD Ryzen 9 7950X", brand: "AMD", family: "Ryzen 9", tdp: 170, gaming_w: 135, idle_w: 20 },
  { id: "amd-ryzen-9-7900x3d", name: "AMD Ryzen 9 7900X3D", brand: "AMD", family: "Ryzen 9", tdp: 120, gaming_w: 85, idle_w: 18 },
  { id: "amd-ryzen-9-7900x", name: "AMD Ryzen 9 7900X", brand: "AMD", family: "Ryzen 9", tdp: 170, gaming_w: 125, idle_w: 20 },
  { id: "amd-ryzen-7-7800x3d", name: "AMD Ryzen 7 7800X3D", brand: "AMD", family: "Ryzen 7", tdp: 120, gaming_w: 65, idle_w: 16 },
  { id: "amd-ryzen-7-7700x", name: "AMD Ryzen 7 7700X", brand: "AMD", family: "Ryzen 7", tdp: 105, gaming_w: 85, idle_w: 17 },
  { id: "amd-ryzen-7-7700", name: "AMD Ryzen 7 7700", brand: "AMD", family: "Ryzen 7", tdp: 65, gaming_w: 65, idle_w: 15 },
  { id: "amd-ryzen-5-7600x", name: "AMD Ryzen 5 7600X", brand: "AMD", family: "Ryzen 5", tdp: 105, gaming_w: 75, idle_w: 15 },
  { id: "amd-ryzen-5-7600", name: "AMD Ryzen 5 7600", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 58, idle_w: 14 },
  { id: "amd-ryzen-5-7500f", name: "AMD Ryzen 5 7500F", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 55, idle_w: 14 },

  // AMD Ryzen 5000 Series (Zen 3) - Most Popular in PH
  { id: "amd-ryzen-9-5950x", name: "AMD Ryzen 9 5950X", brand: "AMD", family: "Ryzen 9", tdp: 105, gaming_w: 110, idle_w: 18 },
  { id: "amd-ryzen-9-5900x", name: "AMD Ryzen 9 5900X", brand: "AMD", family: "Ryzen 9", tdp: 105, gaming_w: 105, idle_w: 18 },
  { id: "amd-ryzen-7-5800x3d", name: "AMD Ryzen 7 5800X3D", brand: "AMD", family: "Ryzen 7", tdp: 105, gaming_w: 75, idle_w: 16 },
  { id: "amd-ryzen-7-5800x", name: "AMD Ryzen 7 5800X", brand: "AMD", family: "Ryzen 7", tdp: 105, gaming_w: 95, idle_w: 16 },
  { id: "amd-ryzen-7-5700x3d", name: "AMD Ryzen 7 5700X3D", brand: "AMD", family: "Ryzen 7", tdp: 105, gaming_w: 70, idle_w: 15 },
  { id: "amd-ryzen-7-5700x", name: "AMD Ryzen 7 5700X", brand: "AMD", family: "Ryzen 7", tdp: 65, gaming_w: 65, idle_w: 14 },
  { id: "amd-ryzen-7-5700g", name: "AMD Ryzen 7 5700G (Integrated Graphics)", brand: "AMD", family: "Ryzen 7", tdp: 65, gaming_w: 60, idle_w: 12 },
  { id: "amd-ryzen-5-5600x", name: "AMD Ryzen 5 5600X", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 65, idle_w: 13 },
  { id: "amd-ryzen-5-5600", name: "AMD Ryzen 5 5600", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 60, idle_w: 13 },
  { id: "amd-ryzen-5-5600g", name: "AMD Ryzen 5 5600G (Integrated Vega 7)", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 55, idle_w: 12 },
  { id: "amd-ryzen-5-5500", name: "AMD Ryzen 5 5500", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 50, idle_w: 12 },
  { id: "amd-ryzen-5-4500", name: "AMD Ryzen 5 4500", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 50, idle_w: 12 },
  { id: "amd-ryzen-3-4100", name: "AMD Ryzen 3 4100", brand: "AMD", family: "Ryzen 3", tdp: 65, gaming_w: 40, idle_w: 10 },
  { id: "amd-ryzen-3-3200g", name: "AMD Ryzen 3 3200G (Integrated Vega 8)", brand: "AMD", family: "Ryzen 3", tdp: 65, gaming_w: 45, idle_w: 10 },
  { id: "amd-ryzen-5-3400g", name: "AMD Ryzen 5 3400G (Integrated Vega 11)", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 50, idle_w: 11 },

  // AMD Ryzen 3000 Series (Zen 2)
  { id: "amd-ryzen-9-3900x", name: "AMD Ryzen 9 3900X", brand: "AMD", family: "Ryzen 9", tdp: 105, gaming_w: 105, idle_w: 18 },
  { id: "amd-ryzen-7-3700x", name: "AMD Ryzen 7 3700X", brand: "AMD", family: "Ryzen 7", tdp: 65, gaming_w: 65, idle_w: 14 },
  { id: "amd-ryzen-5-3600", name: "AMD Ryzen 5 3600", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 65, idle_w: 14 },
  { id: "amd-ryzen-5-2600", name: "AMD Ryzen 5 2600", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 65, idle_w: 14 },
  { id: "amd-ryzen-5-1600", name: "AMD Ryzen 5 1600", brand: "AMD", family: "Ryzen 5", tdp: 65, gaming_w: 65, idle_w: 14 },

  // Intel 14th Gen Raptor Lake Refresh
  { id: "intel-core-i9-14900k", name: "Intel Core i9-14900K", brand: "Intel", family: "Core i9", tdp: 125, gaming_w: 160, idle_w: 22 },
  { id: "intel-core-i9-14900f", name: "Intel Core i9-14900F", brand: "Intel", family: "Core i9", tdp: 65, gaming_w: 120, idle_w: 18 },
  { id: "intel-core-i7-14700k", name: "Intel Core i7-14700K", brand: "Intel", family: "Core i7", tdp: 125, gaming_w: 140, idle_w: 20 },
  { id: "intel-core-i7-14700f", name: "Intel Core i7-14700F", brand: "Intel", family: "Core i7", tdp: 65, gaming_w: 110, idle_w: 18 },
  { id: "intel-core-i5-14600k", name: "Intel Core i5-14600K", brand: "Intel", family: "Core i5", tdp: 125, gaming_w: 105, idle_w: 16 },
  { id: "intel-core-i5-14400", name: "Intel Core i5-14400 / 14400F", brand: "Intel", family: "Core i5", tdp: 65, gaming_w: 70, idle_w: 12 },
  { id: "intel-core-i3-14100", name: "Intel Core i3-14100 / 14100F", brand: "Intel", family: "Core i3", tdp: 60, gaming_w: 45, idle_w: 10 },

  // Intel 13th Gen Raptor Lake
  { id: "intel-core-i9-13900k", name: "Intel Core i9-13900K", brand: "Intel", family: "Core i9", tdp: 125, gaming_w: 155, idle_w: 22 },
  { id: "intel-core-i7-13700k", name: "Intel Core i7-13700K", brand: "Intel", family: "Core i7", tdp: 125, gaming_w: 135, idle_w: 20 },
  { id: "intel-core-i7-13700", name: "Intel Core i7-13700 / 13700F", brand: "Intel", family: "Core i7", tdp: 65, gaming_w: 105, idle_w: 16 },
  { id: "intel-core-i5-13600k", name: "Intel Core i5-13600K", brand: "Intel", family: "Core i5", tdp: 125, gaming_w: 100, idle_w: 15 },
  { id: "intel-core-i5-13400", name: "Intel Core i5-13400 / 13400F", brand: "Intel", family: "Core i5", tdp: 65, gaming_w: 68, idle_w: 12 },
  { id: "intel-core-i3-13100", name: "Intel Core i3-13100 / 13100F", brand: "Intel", family: "Core i3", tdp: 60, gaming_w: 45, idle_w: 10 },

  // Intel 12th Gen Alder Lake
  { id: "intel-core-i9-12900k", name: "Intel Core i9-12900K", brand: "Intel", family: "Core i9", tdp: 125, gaming_w: 145, idle_w: 22 },
  { id: "intel-core-i7-12700k", name: "Intel Core i7-12700K", brand: "Intel", family: "Core i7", tdp: 125, gaming_w: 125, idle_w: 18 },
  { id: "intel-core-i7-12700", name: "Intel Core i7-12700 / 12700F", brand: "Intel", family: "Core i7", tdp: 65, gaming_w: 90, idle_w: 15 },
  { id: "intel-core-i5-12600k", name: "Intel Core i5-12600K", brand: "Intel", family: "Core i5", tdp: 125, gaming_w: 90, idle_w: 14 },
  { id: "intel-core-i5-12400", name: "Intel Core i5-12400 / 12400F", brand: "Intel", family: "Core i5", tdp: 65, gaming_w: 60, idle_w: 12 },
  { id: "intel-core-i3-12100", name: "Intel Core i3-12100 / 12100F", brand: "Intel", family: "Core i3", tdp: 60, gaming_w: 42, idle_w: 10 },

  // Intel 10th & 11th Gen Comet / Rocket Lake
  { id: "intel-core-i9-10900k", name: "Intel Core i9-10900K", brand: "Intel", family: "Core i9", tdp: 125, gaming_w: 130, idle_w: 20 },
  { id: "intel-core-i7-10700", name: "Intel Core i7-10700 / 10700K", brand: "Intel", family: "Core i7", tdp: 65, gaming_w: 95, idle_w: 16 },
  { id: "intel-core-i5-11400", name: "Intel Core i5-11400 / 11400F", brand: "Intel", family: "Core i5", tdp: 65, gaming_w: 75, idle_w: 14 },
  { id: "intel-core-i5-10400", name: "Intel Core i5-10400 / 10400F", brand: "Intel", family: "Core i5", tdp: 65, gaming_w: 55, idle_w: 12 },
  { id: "intel-core-i3-10100", name: "Intel Core i3-10100 / 10105", brand: "Intel", family: "Core i3", tdp: 65, gaming_w: 40, idle_w: 10 },

  // Intel 8th & 9th Gen Coffee Lake
  { id: "intel-core-i9-9900k", name: "Intel Core i9-9900K", brand: "Intel", family: "Core i9", tdp: 95, gaming_w: 110, idle_w: 18 },
  { id: "intel-core-i7-9700k", name: "Intel Core i7-9700K", brand: "Intel", family: "Core i7", tdp: 95, gaming_w: 95, idle_w: 16 },
  { id: "intel-core-i5-9400f", name: "Intel Core i5-9400F", brand: "Intel", family: "Core i5", tdp: 65, gaming_w: 55, idle_w: 12 },
  { id: "intel-core-i7-8700k", name: "Intel Core i7-8700K", brand: "Intel", family: "Core i7", tdp: 95, gaming_w: 90, idle_w: 16 },
  { id: "intel-core-i5-8400", name: "Intel Core i5-8400", brand: "Intel", family: "Core i5", tdp: 65, gaming_w: 55, idle_w: 12 },

  // Generic / Entry Office CPUs
  { id: "generic-office-celeron-pentium", name: "Intel Celeron / Pentium / Core 2 Duo (Office)", brand: "Intel", family: "Basic Office", tdp: 45, gaming_w: 35, idle_w: 10 },
  { id: "generic-amd-athlon", name: "AMD Athlon / A-Series (Office)", brand: "AMD", family: "Basic Office", tdp: 45, gaming_w: 35, idle_w: 10 },
];

export const GPU_CATALOG: GpuHardwareItem[] = [
  // Integrated / None
  { id: "integrated-graphics", name: "Integrated Graphics (No Dedicated GPU / Intel UHD / AMD Radeon Vega)", brand: "None", series: "Integrated", tgp: 0, gaming_w: 0, idle_w: 0 },

  // NVIDIA RTX 40 Series
  { id: "nvidia-rtx-4090", name: "NVIDIA GeForce RTX 4090 24GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 450, gaming_w: 380, idle_w: 25 },
  { id: "nvidia-rtx-4080-super", name: "NVIDIA GeForce RTX 4080 Super 16GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 320, gaming_w: 280, idle_w: 20 },
  { id: "nvidia-rtx-4080", name: "NVIDIA GeForce RTX 4080 16GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 320, gaming_w: 280, idle_w: 20 },
  { id: "nvidia-rtx-4070-ti-super", name: "NVIDIA GeForce RTX 4070 Ti Super 16GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 285, gaming_w: 260, idle_w: 18 },
  { id: "nvidia-rtx-4070-ti", name: "NVIDIA GeForce RTX 4070 Ti 12GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 285, gaming_w: 250, idle_w: 18 },
  { id: "nvidia-rtx-4070-super", name: "NVIDIA GeForce RTX 4070 Super 12GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 220, gaming_w: 205, idle_w: 15 },
  { id: "nvidia-rtx-4070", name: "NVIDIA GeForce RTX 4070 12GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 200, gaming_w: 185, idle_w: 15 },
  { id: "nvidia-rtx-4060-ti", name: "NVIDIA GeForce RTX 4060 Ti 8GB / 16GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 160, gaming_w: 145, idle_w: 12 },
  { id: "nvidia-rtx-4060", name: "NVIDIA GeForce RTX 4060 8GB", brand: "NVIDIA", series: "RTX 40 Series", tgp: 115, gaming_w: 110, idle_w: 10 },

  // NVIDIA RTX 30 Series (Extremely Popular in PH)
  { id: "nvidia-rtx-3090-ti", name: "NVIDIA GeForce RTX 3090 Ti 24GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 450, gaming_w: 430, idle_w: 25 },
  { id: "nvidia-rtx-3090", name: "NVIDIA GeForce RTX 3090 24GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 350, gaming_w: 340, idle_w: 22 },
  { id: "nvidia-rtx-3080-ti", name: "NVIDIA GeForce RTX 3080 Ti 12GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 350, gaming_w: 340, idle_w: 22 },
  { id: "nvidia-rtx-3080", name: "NVIDIA GeForce RTX 3080 10GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 320, gaming_w: 310, idle_w: 20 },
  { id: "nvidia-rtx-3070-ti", name: "NVIDIA GeForce RTX 3070 Ti 8GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 290, gaming_w: 280, idle_w: 18 },
  { id: "nvidia-rtx-3070", name: "NVIDIA GeForce RTX 3070 8GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 220, gaming_w: 215, idle_w: 15 },
  { id: "nvidia-rtx-3060-ti", name: "NVIDIA GeForce RTX 3060 Ti 8GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 200, gaming_w: 195, idle_w: 14 },
  { id: "nvidia-rtx-3060", name: "NVIDIA GeForce RTX 3060 12GB / 8GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 170, gaming_w: 165, idle_w: 12 },
  { id: "nvidia-rtx-3050", name: "NVIDIA GeForce RTX 3050 8GB / 6GB", brand: "NVIDIA", series: "RTX 30 Series", tgp: 130, gaming_w: 115, idle_w: 10 },

  // NVIDIA RTX 20 Series & GTX 16 Series
  { id: "nvidia-rtx-2080-ti", name: "NVIDIA GeForce RTX 2080 Ti 11GB", brand: "NVIDIA", series: "RTX 20 Series", tgp: 250, gaming_w: 245, idle_w: 18 },
  { id: "nvidia-rtx-2080-super", name: "NVIDIA GeForce RTX 2080 Super 8GB", brand: "NVIDIA", series: "RTX 20 Series", tgp: 250, gaming_w: 240, idle_w: 18 },
  { id: "nvidia-rtx-2070-super", name: "NVIDIA GeForce RTX 2070 Super 8GB", brand: "NVIDIA", series: "RTX 20 Series", tgp: 215, gaming_w: 210, idle_w: 16 },
  { id: "nvidia-rtx-2060-super", name: "NVIDIA GeForce RTX 2060 Super 8GB", brand: "NVIDIA", series: "RTX 20 Series", tgp: 175, gaming_w: 170, idle_w: 14 },
  { id: "nvidia-rtx-2060", name: "NVIDIA GeForce RTX 2060 6GB", brand: "NVIDIA", series: "RTX 20 Series", tgp: 160, gaming_w: 155, idle_w: 13 },
  { id: "nvidia-gtx-1660-ti", name: "NVIDIA GeForce GTX 1660 Ti 6GB", brand: "NVIDIA", series: "GTX 16 Series", tgp: 120, gaming_w: 115, idle_w: 10 },
  { id: "nvidia-gtx-1660-super", name: "NVIDIA GeForce GTX 1660 Super 6GB", brand: "NVIDIA", series: "GTX 16 Series", tgp: 125, gaming_w: 120, idle_w: 10 },
  { id: "nvidia-gtx-1660", name: "NVIDIA GeForce GTX 1660 6GB", brand: "NVIDIA", series: "GTX 16 Series", tgp: 120, gaming_w: 115, idle_w: 10 },
  { id: "nvidia-gtx-1650-super", name: "NVIDIA GeForce GTX 1650 Super 4GB", brand: "NVIDIA", series: "GTX 16 Series", tgp: 100, gaming_w: 95, idle_w: 9 },
  { id: "nvidia-gtx-1650", name: "NVIDIA GeForce GTX 1650 4GB", brand: "NVIDIA", series: "GTX 16 Series", tgp: 75, gaming_w: 70, idle_w: 8 },

  // NVIDIA GTX 10 Series & Legacy
  { id: "nvidia-gtx-1080-ti", name: "NVIDIA GeForce GTX 1080 Ti 11GB", brand: "NVIDIA", series: "GTX 10 Series", tgp: 250, gaming_w: 240, idle_w: 16 },
  { id: "nvidia-gtx-1080", name: "NVIDIA GeForce GTX 1080 8GB", brand: "NVIDIA", series: "GTX 10 Series", tgp: 180, gaming_w: 175, idle_w: 14 },
  { id: "nvidia-gtx-1070-ti", name: "NVIDIA GeForce GTX 1070 Ti 8GB", brand: "NVIDIA", series: "GTX 10 Series", tgp: 180, gaming_w: 175, idle_w: 14 },
  { id: "nvidia-gtx-1070", name: "NVIDIA GeForce GTX 1070 8GB", brand: "NVIDIA", series: "GTX 10 Series", tgp: 150, gaming_w: 145, idle_w: 12 },
  { id: "nvidia-gtx-1060-6gb", name: "NVIDIA GeForce GTX 1060 6GB / 3GB", brand: "NVIDIA", series: "GTX 10 Series", tgp: 120, gaming_w: 115, idle_w: 10 },
  { id: "nvidia-gtx-1050-ti", name: "NVIDIA GeForce GTX 1050 Ti 4GB", brand: "NVIDIA", series: "GTX 10 Series", tgp: 75, gaming_w: 70, idle_w: 7 },
  { id: "nvidia-gt-1030", name: "NVIDIA GeForce GT 1030 2GB", brand: "NVIDIA", series: "Entry", tgp: 30, gaming_w: 28, idle_w: 5 },
  { id: "nvidia-gt-730", name: "NVIDIA GeForce GT 730 / 710", brand: "NVIDIA", series: "Entry", tgp: 25, gaming_w: 23, idle_w: 5 },

  // AMD Radeon RX 7000 Series (RDNA 3)
  { id: "amd-rx-7900-xtx", name: "AMD Radeon RX 7900 XTX 24GB", brand: "AMD", series: "RX 7000 Series", tgp: 355, gaming_w: 340, idle_w: 25 },
  { id: "amd-rx-7900-xt", name: "AMD Radeon RX 7900 XT 20GB", brand: "AMD", series: "RX 7000 Series", tgp: 315, gaming_w: 300, idle_w: 22 },
  { id: "amd-rx-7800-xt", name: "AMD Radeon RX 7800 XT 16GB", brand: "AMD", series: "RX 7000 Series", tgp: 263, gaming_w: 250, idle_w: 18 },
  { id: "amd-rx-7700-xt", name: "AMD Radeon RX 7700 XT 12GB", brand: "AMD", series: "RX 7000 Series", tgp: 245, gaming_w: 230, idle_w: 18 },
  { id: "amd-rx-7600-xt", name: "AMD Radeon RX 7600 XT 16GB", brand: "AMD", series: "RX 7000 Series", tgp: 190, gaming_w: 180, idle_w: 14 },
  { id: "amd-rx-7600", name: "AMD Radeon RX 7600 8GB", brand: "AMD", series: "RX 7000 Series", tgp: 165, gaming_w: 160, idle_w: 13 },

  // AMD Radeon RX 6000 Series (RDNA 2)
  { id: "amd-rx-6950-xt", name: "AMD Radeon RX 6950 XT 16GB", brand: "AMD", series: "RX 6000 Series", tgp: 335, gaming_w: 330, idle_w: 22 },
  { id: "amd-rx-6900-xt", name: "AMD Radeon RX 6900 XT 16GB", brand: "AMD", series: "RX 6000 Series", tgp: 300, gaming_w: 295, idle_w: 20 },
  { id: "amd-rx-6800-xt", name: "AMD Radeon RX 6800 XT 16GB", brand: "AMD", series: "RX 6000 Series", tgp: 300, gaming_w: 290, idle_w: 20 },
  { id: "amd-rx-6800", name: "AMD Radeon RX 6800 16GB", brand: "AMD", series: "RX 6000 Series", tgp: 250, gaming_w: 235, idle_w: 16 },
  { id: "amd-rx-6700-xt", name: "AMD Radeon RX 6700 XT / 6750 XT 12GB", brand: "AMD", series: "RX 6000 Series", tgp: 230, gaming_w: 215, idle_w: 15 },
  { id: "amd-rx-6650-xt", name: "AMD Radeon RX 6650 XT 8GB", brand: "AMD", series: "RX 6000 Series", tgp: 180, gaming_w: 175, idle_w: 13 },
  { id: "amd-rx-6600-xt", name: "AMD Radeon RX 6600 XT 8GB", brand: "AMD", series: "RX 6000 Series", tgp: 160, gaming_w: 155, idle_w: 12 },
  { id: "amd-rx-6600", name: "AMD Radeon RX 6600 8GB", brand: "AMD", series: "RX 6000 Series", tgp: 132, gaming_w: 125, idle_w: 10 },
  { id: "amd-rx-6500-xt", name: "AMD Radeon RX 6500 XT 4GB", brand: "AMD", series: "RX 6000 Series", tgp: 107, gaming_w: 100, idle_w: 8 },
  { id: "amd-rx-6400", name: "AMD Radeon RX 6400 4GB", brand: "AMD", series: "RX 6000 Series", tgp: 53, gaming_w: 50, idle_w: 6 },

  // AMD Radeon RX 500 Series & Legacy
  { id: "amd-rx-580", name: "AMD Radeon RX 580 8GB / 4GB", brand: "AMD", series: "Polaris", tgp: 185, gaming_w: 175, idle_w: 15 },
  { id: "amd-rx-570", name: "AMD Radeon RX 570 8GB / 4GB", brand: "AMD", series: "Polaris", tgp: 150, gaming_w: 140, idle_w: 14 },
  { id: "amd-rx-560", name: "AMD Radeon RX 560 / 550", brand: "AMD", series: "Polaris", tgp: 75, gaming_w: 65, idle_w: 8 },

  // Intel Arc
  { id: "intel-arc-a770", name: "Intel Arc A770 16GB", brand: "Intel", series: "Intel Arc", tgp: 225, gaming_w: 215, idle_w: 25 },
  { id: "intel-arc-a750", name: "Intel Arc A750 8GB", brand: "Intel", series: "Intel Arc", tgp: 225, gaming_w: 210, idle_w: 25 },
  { id: "intel-arc-a580", name: "Intel Arc A580 8GB", brand: "Intel", series: "Intel Arc", tgp: 185, gaming_w: 175, idle_w: 20 },
  { id: "intel-arc-a380", name: "Intel Arc A380 6GB", brand: "Intel", series: "Intel Arc", tgp: 75, gaming_w: 65, idle_w: 12 },
];
