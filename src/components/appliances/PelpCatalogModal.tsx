import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { Badge } from "../common/Badge";
import {
  Search,
  Download,
  Star,
  CheckCircle2,
  Zap,
  Info,
  Layers,
} from "lucide-react";
import { PELP_CATEGORIES, searchPelpDatabase } from "../../lib/pelpService";
import { PelpItem } from "../../types";
import { useCreate } from "@refinedev/core";
import { getDefaultStartHour } from "../../lib/loadCurveService";

interface PelpCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PelpCatalogModal: React.FC<PelpCatalogModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("air-conditioners");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [items, setItems] = useState<PelpItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [importedControlNo, setImportedControlNo] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  const { mutate: createAppliance } = useCreate();

  useEffect(() => {
    if (isOpen) {
      setDisplayLimit(30);
      loadData();
    }
  }, [isOpen, selectedCategory, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await searchPelpDatabase(searchQuery, selectedCategory);
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (item: PelpItem) => {
    const monthlyKwh = item.monthly_energy_consumption_kwh || 120;
    const watts = item.power_watts || 750;
    const estimatedCost = monthlyKwh * 14.8261;

    // Room guess based on category
    let room = "Living Room";
    if (item.category.includes("Refrigerat") || item.category.includes("Kitchen")) room = "Kitchen";
    else if (item.category.includes("Washing")) room = "Laundry Area";
    else if (item.category.includes("Television")) room = "Living Room";
    else if (item.category.includes("Air")) room = "Master Bedroom";
    else if (item.category.includes("Fan")) room = "Living Room";

    const startH = getDefaultStartHour(item.category);
    let hoursPerDay = 8;
    if (item.category.includes("Refrigerat")) hoursPerDay = 24;
    else if (item.category.includes("Fan")) hoursPerDay = 10;
    else if (item.category.includes("Television")) hoursPerDay = 5;
    else if (item.category.includes("Washing")) hoursPerDay = 1.5;

    createAppliance({
      resource: "user_appliances",
      values: {
        name: `${item.brand} ${item.model}`,
        category: item.category,
        brand: item.brand,
        model: item.model,
        control_no: item.control_no,
        source: "pelp_db",
        watts: watts,
        voltage: 230,
        quantity: 1,
        hours_per_day: hoursPerDay,
        days_per_month: 30,
        start_hour: startH,
        monthly_kwh: monthlyKwh,
        estimated_cost: Math.round(estimatedCost * 100) / 100,
        energy_rating: `${item.star_rating}-Star Official DOE`,
        room_location: room,
        is_active: true,
        is_currently_on: false,
      },
    });

    setImportedControlNo(item.control_no);
    setTimeout(() => setImportedControlNo(null), 2500);
  };

  const currentCategoryObj = PELP_CATEGORIES.find((c) => c.slug === selectedCategory);
  const displayedItems = items.slice(0, displayLimit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DOE Philippine Energy Labeling Program (PELP) Database"
      subtitle="Official Department of Energy certified laboratory ratings & technical specifications"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Category Tabs with exact counts */}
        <div className="flex flex-wrap gap-1.5 pb-2 border-b pf-divider">
          {PELP_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setSelectedCategory(cat.slug);
                setDisplayLimit(30);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCategory === cat.slug
                  ? "bg-[#5c68db] text-white shadow-xs"
                  : "btn-secondary"
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                  selectedCategory === cat.slug
                    ? "bg-[#3e47ad] text-white"
                    : "bg-[#5c68db]/15 text-[#8183fc]"
                }`}
              >
                {cat.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>

        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 t-muted absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search in ${currentCategoryObj?.name || "appliances"} by brand, model, or control number...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pf-input rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none"
            />
          </div>

          <span className="text-xs t-muted shrink-0">
            Showing <strong className="t-primary">{displayedItems.length}</strong> of <strong className="t-primary">{items.length}</strong> matching models
          </span>
        </div>

        {/* Appliance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
          {loading ? (
            <div className="col-span-2 py-16 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-[#5c68db] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs t-muted">Loading verified DOE certified registry...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="col-span-2 py-16 text-center rounded-2xl pf-input space-y-2">
              <Info className="w-6 h-6 t-muted mx-auto" />
              <p className="text-xs font-bold t-primary">No Certified Models Found</p>
              <p className="text-xs t-muted max-w-sm mx-auto">
                No official models in this category matched "{searchQuery}". Try searching by brand (e.g. Carrier, Panasonic, Sharp, Daikin, LG, Samsung).
              </p>
            </div>
          ) : (
            displayedItems.map((item) => {
              const isImported = importedControlNo === item.control_no;
              const extraSpec = item.raw_specs?._extraSpec || item.type;

              return (
                <div
                  key={item.control_no}
                  className="p-4 rounded-2xl pf-input hover:border-[#5c68db] transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-amber-500 dark:text-yellow-400 tracking-wide block">
                          {item.brand}
                        </span>
                        <h4 className="text-xs font-bold t-primary line-clamp-1 mt-0.5">
                          {item.model}
                        </h4>
                        {extraSpec && (
                          <p className="text-[11px] t-accent line-clamp-1 mt-0.5 font-medium">
                            {extraSpec}
                          </p>
                        )}
                      </div>

                      {item.star_rating ? (
                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-amber-500 dark:text-yellow-400 text-xs font-bold font-mono">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{item.star_rating}★</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t pf-divider text-xs">
                      <div>
                        <span className="text-[10px] t-muted block">Power Draw</span>
                        <span className="font-bold t-primary font-mono">
                          {item.power_watts ? `${item.power_watts} W` : "Standard"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] t-muted block">Monthly Consumption</span>
                        <span className="font-bold t-primary font-mono">
                          {item.monthly_energy_consumption_kwh ? `${item.monthly_energy_consumption_kwh} kWh` : "Standard"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t pf-divider flex items-center justify-between">
                    <span className="text-[10px] font-mono t-muted truncate max-w-[150px]">
                      {item.control_no}
                    </span>

                    {isImported ? (
                      <button
                        disabled
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Imported!</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleImport(item)}
                        className="px-3 py-1.5 rounded-xl btn-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Add to Inventory</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > displayLimit && (
          <div className="pt-2 text-center">
            <button
              onClick={() => setDisplayLimit((prev) => prev + 30)}
              className="px-4 py-2 rounded-xl btn-secondary text-xs font-bold cursor-pointer"
            >
              Load More Models ({items.length - displayLimit} remaining)
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
