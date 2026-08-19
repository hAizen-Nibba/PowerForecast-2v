import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Button } from "../common/Button";
import { UserAppliance } from "../../types";
import { useCreate, useUpdate } from "@refinedev/core";
import { getDefaultStartHour, formatHourDetailed } from "../../lib/loadCurveService";

interface ApplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  applianceToEdit?: UserAppliance | null;
}

export const ApplianceModal: React.FC<ApplianceModalProps> = ({
  isOpen,
  onClose,
  applianceToEdit,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Air Conditioners");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [watts, setWatts] = useState(750);
  const [quantity, setQuantity] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [daysPerMonth, setDaysPerMonth] = useState(30);
  const [startHour, setStartHour] = useState<number>(13);
  const [roomLocation, setRoomLocation] = useState("Living Room");
  const [energyRating, setEnergyRating] = useState("5-Star Inverter");

  const { mutate: createAppliance } = useCreate();
  const { mutate: updateAppliance } = useUpdate();

  useEffect(() => {
    if (applianceToEdit) {
      setName(applianceToEdit.name || "");
      const cat = applianceToEdit.category || "Air Conditioners";
      setCategory(cat);
      setBrand(applianceToEdit.brand || "");
      setModel(applianceToEdit.model || "");
      setWatts(applianceToEdit.watts || 100);
      setQuantity(applianceToEdit.quantity || 1);
      setHoursPerDay(applianceToEdit.hours_per_day || 8);
      setDaysPerMonth(applianceToEdit.days_per_month || 30);
      setStartHour(applianceToEdit.start_hour !== undefined ? applianceToEdit.start_hour : getDefaultStartHour(cat));
      setRoomLocation(applianceToEdit.room_location || "Living Room");
      setEnergyRating(applianceToEdit.energy_rating || "5-Star");
    } else {
      setName("");
      setCategory("Air Conditioners");
      setBrand("");
      setModel("");
      setWatts(750);
      setQuantity(1);
      setHoursPerDay(8);
      setDaysPerMonth(30);
      setStartHour(13);
      setRoomLocation("Living Room");
      setEnergyRating("5-Star");
    }
  }, [applianceToEdit, isOpen]);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setStartHour(getDefaultStartHour(newCat));
    if (newCat === "Air Conditioners") setWatts(750);
    else if (newCat === "Refrigerators & Freezers") setWatts(180);
    else if (newCat === "Television Sets") setWatts(120);
    else if (newCat === "Electric Fans") setWatts(65);
    else if (newCat === "Washing Machines") setWatts(450);
    else if (newCat === "Lighting Products") setWatts(15);
  };

  const calculatedMonthlyKwh = (watts * hoursPerDay * daysPerMonth * quantity) / 1000;
  const calculatedMonthlyCost = calculatedMonthlyKwh * 14.8261;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name,
      category,
      brand,
      model,
      watts,
      quantity,
      hours_per_day: hoursPerDay,
      days_per_month: daysPerMonth,
      start_hour: startHour,
      room_location: roomLocation,
      energy_rating: energyRating,
      monthly_kwh: calculatedMonthlyKwh,
      estimated_cost: calculatedMonthlyCost,
      is_active: true,
    };

    if (applianceToEdit) {
      updateAppliance({
        resource: "user_appliances",
        id: applianceToEdit.id,
        values: payload,
      });
    } else {
      createAppliance({
        resource: "user_appliances",
        values: {
          ...payload,
          is_currently_on: false,
        },
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={applianceToEdit ? "Edit Appliance" : "Add Appliance"}
      subtitle="Configure appliance specs, operational hours, and room allocation"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="t-secondary font-semibold block mb-1">Appliance Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Living Room AC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pf-input rounded-xl px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="t-secondary font-semibold block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full pf-input rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
            >
              <option value="Air Conditioners">Air Conditioners</option>
              <option value="Refrigerators & Freezers">Refrigerators & Freezers</option>
              <option value="Television Sets">Television Sets</option>
              <option value="Electric Fans">Electric Fans</option>
              <option value="Washing Machines">Washing Machines</option>
              <option value="Lighting Products">Lighting Products</option>
              <option value="Kitchen & Cooking">Kitchen & Cooking</option>
              <option value="Other Electronics">Other Electronics</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="t-secondary font-semibold block mb-1">Brand</label>
            <input
              type="text"
              placeholder="e.g. Carrier"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full pf-input rounded-xl px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="t-secondary font-semibold block mb-1">Model</label>
            <input
              type="text"
              placeholder="e.g. Inverter"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full pf-input rounded-xl px-3 py-2 focus:outline-none"
            />
          </div>

          <div>
            <label className="t-secondary font-semibold block mb-1">Room</label>
            <select
              value={roomLocation}
              onChange={(e) => setRoomLocation(e.target.value)}
              className="w-full pf-input rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
            >
              <option value="Living Room">Living Room</option>
              <option value="Master Bedroom">Master Bedroom</option>
              <option value="Bedroom 2">Bedroom 2</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Dining Room">Dining Room</option>
              <option value="Laundry Area">Laundry Area</option>
              <option value="Home Office">Home Office</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div>
            <label className="t-secondary font-semibold block mb-1">Watts</label>
            <input
              type="number"
              min="1"
              required
              value={watts}
              onChange={(e) => setWatts(Number(e.target.value))}
              className="w-full pf-input rounded-xl px-3 py-2 font-mono font-bold"
            />
          </div>

          <div>
            <label className="t-secondary font-semibold block mb-1">Qty</label>
            <input
              type="number"
              min="1"
              max="50"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full pf-input rounded-xl px-3 py-2 font-mono font-bold"
            />
          </div>

          <div>
            <label className="t-secondary font-semibold block mb-1">Start Time</label>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full pf-input rounded-xl px-2 py-2 font-mono text-[11px] cursor-pointer"
            >
              {category.includes("Refrigerat") ? (
                <option value={0}>24/7 (All Day)</option>
              ) : (
                Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHourDetailed(i)} {(i >= 11 && i < 16) || (i >= 18 && i < 21) ? "(Peak)" : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="t-secondary font-semibold block mb-1">Hrs / Day</label>
            <input
              type="number"
              min="0.1"
              max="24"
              step="0.5"
              required
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="w-full pf-input rounded-xl px-3 py-2 font-mono font-bold"
            />
          </div>

          <div>
            <label className="t-secondary font-semibold block mb-1">Days / Mo</label>
            <input
              type="number"
              min="1"
              max="31"
              required
              value={daysPerMonth}
              onChange={(e) => setDaysPerMonth(Number(e.target.value))}
              className="w-full pf-input rounded-xl px-3 py-2 font-mono font-bold"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl pf-input flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] t-accent block font-semibold">Monthly Load</span>
            <span className="text-base font-black t-primary font-mono">
              {calculatedMonthlyKwh.toFixed(1)} <span className="text-xs t-muted font-normal font-sans">kWh/mo</span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] t-accent block font-semibold">Est. Cost</span>
            <span className="text-base font-black text-amber-500 dark:text-amber-400 font-mono">
              ₱{calculatedMonthlyCost.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="secondary" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit">
            {applianceToEdit ? "Save Changes" : "Register Appliance"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
