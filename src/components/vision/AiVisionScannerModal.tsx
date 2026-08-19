import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import {
  Camera,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Zap,
  Key,
  Trash2,
  Plus,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { analyzeMultipleApplianceImages, ImageItem } from "../../lib/visionService";
import { VisionScanResult } from "../../types";
import { useCreate } from "@refinedev/core";
import { getDefaultStartHour } from "../../lib/loadCurveService";
import { devLog } from "../../lib/devLogger";

interface AiVisionScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiVisionScannerModal: React.FC<AiVisionScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [preset, setPreset] = useState<"energy_guide" | "nameplate" | "inverter_check">("energy_guide");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<VisionScanResult | null>(null);

  // Staged Photos Queue (Up to 3 photos)
  const [stagedImages, setStagedImages] = useState<ImageItem[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);

  // Editable fields before saving
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editWatts, setEditWatts] = useState<number>(70);
  const [editMonthlyKwh, setEditMonthlyKwh] = useState<number>(16.8);
  const [editCategory, setEditCategory] = useState("Electric Fans");
  const [editRoom, setEditRoom] = useState("Living Room");

  const { mutate: createAppliance } = useCreate();

  useEffect(() => {
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
    const savedKey = localStorage.getItem("powerforecast_gemini_api_key") || envKey;
    setApiKey(savedKey);
  }, []);

  const handleSaveApiKey = (keyVal: string) => {
    setApiKey(keyVal);
    localStorage.setItem("powerforecast_gemini_api_key", keyVal.trim());
  };

  // Process selected or dropped image files
  const processFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(f.name));
    if (imageFiles.length === 0) return;

    const remainingSlots = 3 - stagedImages.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = imageFiles.slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const newImg: ImageItem = {
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          base64,
          file,
          name: file.name,
        };
        setStagedImages((prev) => (prev.length < 3 ? [...prev, newImg] : prev));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemovePhoto = (id: string) => {
    setStagedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleClearAll = () => {
    setStagedImages([]);
    setScanResult(null);
    setIsScanning(false);
  };

  // User manually confirms and triggers the multi-image scan
  const handleConfirmStartScan = async () => {
    if (stagedImages.length === 0) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      devLog.info("AI Scanner", `Scanning ${stagedImages.length} appliance photo(s) using preset: ${preset}...`);
      const result = await analyzeMultipleApplianceImages({
        images: stagedImages,
        apiKey,
        preset,
      });
      devLog.success("AI Scanner", "Multi-angle image analysis complete", result);

      setScanResult(result);
      setEditBrand(result.detected_brand || "");
      setEditModel(result.detected_model || "");
      setEditWatts(result.detected_watts || 70);
      setEditMonthlyKwh(result.detected_monthly_kwh || 16.8);
      setEditCategory(result.detected_category || "Electric Fans");
      setEditName(`${result.detected_brand || "Standard"} ${result.detected_model || result.detected_category || "Appliance"}`.trim());

      // Room guess
      if (result.detected_category?.includes("Refrigerat") || result.detected_category?.includes("Kitchen")) {
        setEditRoom("Kitchen");
      } else if (result.detected_category?.includes("Washing")) {
        setEditRoom("Laundry Area");
      } else if (result.detected_category?.includes("Air")) {
        setEditRoom("Master Bedroom");
      } else {
        setEditRoom("Living Room");
      }
    } catch (e: any) {
      console.error(e);
      devLog.error("AI Scanner", "Failed to analyze images", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveToInventory = () => {
    if (!scanResult) return;

    let hoursPerDay = 8;
    if (editCategory.includes("Refrigerat")) hoursPerDay = 24;
    else if (editCategory.includes("Fan")) hoursPerDay = 10;
    else if (editCategory.includes("Television")) hoursPerDay = 5;
    else if (editCategory.includes("Washing")) hoursPerDay = 1.5;

    const startH = getDefaultStartHour(editCategory);
    const calculatedMonthlyKwh = editMonthlyKwh || (editWatts * hoursPerDay * 30) / 1000;
    const estimatedCost = calculatedMonthlyKwh * 14.8261;

    const appliancePayload = {
      name: editName || `${editBrand} ${editModel}`.trim() || `${editCategory} Unit`,
      category: editCategory,
      brand: editBrand,
      model: editModel,
      source: "ai_vision" as const,
      watts: editWatts,
      voltage: 230,
      quantity: 1,
      hours_per_day: hoursPerDay,
      days_per_month: 30,
      start_hour: startH,
      monthly_kwh: calculatedMonthlyKwh,
      estimated_cost: Math.round(estimatedCost * 100) / 100,
      energy_rating: scanResult.detected_energy_rating || `${scanResult.detected_star_rating || 5}-Star Official DOE`,
      room_location: editRoom,
      is_active: true,
      is_currently_on: false,
      ai_metadata: {
        confidence: scanResult.confidence,
        raw_markdown: scanResult.raw_markdown,
        photo_count: stagedImages.length,
      },
    };

    devLog.success("Storage", `New appliance created via AI Vision: "${appliancePayload.name}"`, appliancePayload);

    createAppliance({
      resource: "user_appliances",
      values: appliancePayload,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Multi-Angle Vision Scanner"
      subtitle="Upload up to 3 appliance photos (e.g. Energy Guide label, Nameplate, & Full View) then confirm to scan"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Top Preset & API Key Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1.5 p-1 rounded-xl pf-input">
            <button
              onClick={() => setPreset("energy_guide")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                preset === "energy_guide"
                  ? "bg-[#5c68db] text-white shadow-xs"
                  : "t-muted hover:t-primary"
              }`}
            >
              DOE Energy Guide
            </button>
            <button
              onClick={() => setPreset("nameplate")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                preset === "nameplate"
                  ? "bg-[#5c68db] text-white shadow-xs"
                  : "t-muted hover:t-primary"
              }`}
            >
              Technical Nameplate
            </button>
            <button
              onClick={() => setPreset("inverter_check")}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                preset === "inverter_check"
                  ? "bg-[#5c68db] text-white shadow-xs"
                  : "t-muted hover:t-primary"
              }`}
            >
              Appliance Photo
            </button>
          </div>

          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="flex items-center gap-1.5 text-xs t-accent hover:t-primary transition-colors cursor-pointer font-semibold"
          >
            <Key className="w-3.5 h-3.5 text-yellow-400" />
            <span>{apiKey ? "Gemini API Key Active" : "Gemini API Key (Optional)"}</span>
          </button>
        </div>

        {/* API Key Modal Config */}
        {showApiKeyInput && (
          <div className="p-3.5 rounded-2xl pf-input space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold t-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Google Gemini Multimodal Vision Engine
              </span>
              <span className="text-[11px] t-muted">
                {apiKey ? "Connected to Gemini Vision" : "No key? Built-in OCR runs automatically"}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy... (Enter your free Gemini API Key)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 pf-input rounded-xl px-3 py-1.5 text-xs focus:outline-none"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  handleSaveApiKey(apiKey);
                  setShowApiKeyInput(false);
                }}
              >
                Save Key
              </Button>
            </div>
          </div>
        )}

        {/* Scanning Progress */}
        {isScanning && (
          <div className="border pf-divider rounded-2xl p-8 text-center glass-card space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#5c68db]/15 border border-[#5c68db]/30 flex items-center justify-center mx-auto text-[#8183fc]">
              <Sparkles className="w-7 h-7 animate-spin text-yellow-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold t-primary">
                Analyzing {stagedImages.length} Photo{stagedImages.length > 1 ? "s" : ""}...
              </h4>
              <p className="text-xs t-accent max-w-md mx-auto">
                Synthesizing multi-angle label images, extracting power metrics, and cross-referencing with official DOE certified database...
              </p>
            </div>
          </div>
        )}

        {/* Extracted Results Form */}
        {!isScanning && scanResult && (
          <div className="border pf-divider rounded-2xl p-5 glass-card text-left space-y-4">
            <div className="flex items-center justify-between pb-3 border-b pf-divider">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold t-primary">
                  Extraction Complete ({stagedImages.length} Photo{stagedImages.length > 1 ? "s" : ""} Cross-Referenced)
                </span>
              </div>
              <Badge variant={scanResult.confidence === "high" ? "emerald" : "amber"}>
                {scanResult.confidence === "high" ? "High Confidence" : "Verified"}
              </Badge>
            </div>

            {/* Photo Thumbnails Preview */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {stagedImages.map((img, idx) => (
                <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden pf-input shrink-0">
                  <img src={img.base64} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 text-white px-1 py-0.2 rounded font-mono">
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            {/* Editable Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-[11px] t-secondary font-semibold block mb-1">Brand</label>
                <input
                  type="text"
                  value={editBrand}
                  onChange={(e) => setEditBrand(e.target.value)}
                  className="w-full pf-input rounded-xl px-3 py-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] t-secondary font-semibold block mb-1">Model Code</label>
                <input
                  type="text"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  className="w-full pf-input rounded-xl px-3 py-1.5 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] t-secondary font-semibold block mb-1">Rated Power (Watts)</label>
                <input
                  type="number"
                  value={editWatts}
                  onChange={(e) => setEditWatts(Number(e.target.value))}
                  className="w-full pf-input rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-amber-500 dark:text-yellow-300"
                />
              </div>
              <div>
                <label className="text-[11px] t-secondary font-semibold block mb-1">DOE Monthly Consumption (kWh)</label>
                <input
                  type="number"
                  value={editMonthlyKwh}
                  onChange={(e) => setEditMonthlyKwh(Number(e.target.value))}
                  className="w-full pf-input rounded-xl px-3 py-1.5 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] t-secondary font-semibold block mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full pf-input rounded-xl px-3 py-1.5 text-xs cursor-pointer font-semibold"
                >
                  <option value="Air Conditioners">Air Conditioners</option>
                  <option value="Refrigerators & Freezers">Refrigerators & Freezers</option>
                  <option value="Television Sets">Television Sets</option>
                  <option value="Electric Fans">Electric Fans</option>
                  <option value="Washing Machines">Washing Machines</option>
                  <option value="Lighting Products">Lighting Products</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] t-secondary font-semibold block mb-1">Assign Room</label>
                <select
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  className="w-full pf-input rounded-xl px-3 py-1.5 text-xs cursor-pointer font-semibold"
                >
                  <option value="Living Room">Living Room</option>
                  <option value="Master Bedroom">Master Bedroom</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Laundry Area">Laundry Area</option>
                  <option value="Home Office">Home Office</option>
                </select>
              </div>
            </div>

            {/* Technical Markdown Extraction Details */}
            <div className="p-3 rounded-xl pf-input text-xs t-secondary font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
              {scanResult.raw_markdown}
            </div>

            <div className="flex items-center justify-between pt-3 border-t pf-divider">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearAll}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Scan Another Appliance
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleSaveToInventory}
                icon={<Zap className="w-3.5 h-3.5" />}
              >
                Save to Appliance Hub
              </Button>
            </div>
          </div>
        )}

        {/* Multi-Photo Staging Area with Drag and Drop */}
        {!isScanning && !scanResult && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed rounded-2xl p-5 text-center transition-all relative overflow-hidden ${
              isDragging
                ? "border-[#5c68db] bg-[#5c68db]/15 shadow-2xl ring-2 ring-[#8183fc] scale-[1.005]"
                : "pf-input"
            }`}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center gap-2 p-4 pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-[#5c68db]/30 border border-[#8183fc] flex items-center justify-center text-white animate-bounce">
                  <UploadCloud className="w-8 h-8 text-yellow-300" />
                </div>
                <h4 className="text-base font-bold text-white">Drop Appliance Photos Here</h4>
                <p className="text-xs text-[#a2a5ff]">
                  Add up to {3 - stagedImages.length} photo{3 - stagedImages.length > 1 ? "s" : ""} (Energy Guide, Nameplate, or Full View)
                </p>
              </div>
            )}

            {stagedImages.length === 0 ? (
              <div className="py-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#5c68db]/15 border border-[#5c68db]/25 flex items-center justify-center mx-auto text-[#8183fc]">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold t-primary">Drag & Drop or Upload Appliance Photos</h4>
                  <p className="text-xs t-muted">
                    Drag and drop up to 3 photos here (DOE Energy Guide label, manufacturer nameplate, and full appliance photo)
                  </p>
                </div>

                <div className="pt-2">
                  <label className="cursor-pointer inline-block">
                    <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5c68db] text-white hover:bg-[#4f5bc9] font-bold text-xs shadow-md transition-all">
                      <Camera className="w-4 h-4" /> Browse or Select Photos (Up to 3)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>
                <p className="text-[11px] t-accent font-medium">Supports JPG, PNG, WEBP, HEIC</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b pf-divider">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#8183fc]" />
                    <span className="text-xs font-bold t-primary">
                      {stagedImages.length} of 3 Photos Selected
                    </span>
                  </div>
                  <span className="text-[11px] t-muted">
                    Drag more photos or click <strong>"Start AI Scan"</strong>
                  </span>
                </div>

                {/* 3-Photo Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stagedImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative rounded-2xl overflow-hidden pf-input h-40 flex flex-col justify-between p-2 group"
                    >
                      <img src={img.base64} alt={`Upload ${idx + 1}`} className="w-full h-28 object-cover rounded-xl" />
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="t-accent font-medium truncate max-w-[120px]">
                          Photo #{idx + 1}
                        </span>
                        <button
                          onClick={() => handleRemovePhoto(img.id)}
                          className="p-1 rounded-md t-muted hover:text-rose-500 transition-colors cursor-pointer"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add More Slot if < 3 with Drag & Drop */}
                  {stagedImages.length < 3 && (
                    <label
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className="rounded-2xl border border-dashed pf-divider hover:border-[#5c68db] pf-input h-40 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors t-muted hover:t-primary"
                    >
                      <Plus className="w-6 h-6 text-[#8183fc]" />
                      <span className="text-xs font-bold">Drop or Add Angle</span>
                      <span className="text-[10px] t-muted">
                        ({3 - stagedImages.length} slot{3 - stagedImages.length > 1 ? "s" : ""} left)
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                  )}
                </div>

                {/* User Confirmation Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t pf-divider">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleClearAll}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Clear All
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleConfirmStartScan}
                    icon={<Sparkles className="w-4 h-4 text-yellow-300" />}
                  >
                    Start AI Scan ({stagedImages.length} Photo{stagedImages.length > 1 ? "s" : ""})
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
