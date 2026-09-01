import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Search as SearchIcon,
  Download as ImportIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  Store as StoreIcon,
} from "@mui/icons-material";
import { PELP_CATEGORIES, searchPelpDatabase } from "../../lib/pelpService";
import { PelpItem, ApplianceList, UserAppliance } from "../../types";
import { useCreate, useList, useUpdate } from "@refinedev/core";
import { getDefaultStartHour } from "../../lib/loadCurveService";
import { DuplicateApplianceModal } from "./DuplicateApplianceModal";
import { ApplianceRoutineModal } from "./ApplianceRoutineModal";

interface PelpCatalogTabContentProps {
  selectedListId: string;
  onSelectedListIdChange?: (listId: string) => void;
  onClose: () => void;
}

export const PelpCatalogTabContent: React.FC<PelpCatalogTabContentProps> = ({
  selectedListId,
  onSelectedListIdChange,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("air-conditioners");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [items, setItems] = useState<PelpItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [importedControlNo, setImportedControlNo] = useState<string | null>(null);

  // Routine & Target Quota Modal state
  const [routineModalIncoming, setRoutineModalIncoming] = useState<Partial<UserAppliance> | null>(null);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);

  // Duplicate modal states
  const [duplicateIncoming, setDuplicateIncoming] = useState<Partial<UserAppliance> | null>(null);
  const [duplicateExisting, setDuplicateExisting] = useState<UserAppliance | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  const listsRes = useList<ApplianceList>({
    resource: "appliance_lists",
  }) as any;

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
  }) as any;

  const spaces: ApplianceList[] = listsRes?.data?.data || listsRes?.result?.data || [];
  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  const { mutate: createAppliance } = useCreate();
  const { mutate: updateAppliance } = useUpdate();

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery]);

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

    let room = "Living Room";
    if (item.category.includes("Refrigerat") || item.category.includes("Kitchen")) room = "Kitchen";

    const targetListId = selectedListId || (spaces[0]?.id ?? null);
    const targetSpace = spaces.find((s) => s.id === targetListId);

    const isInverter = Boolean(
      (item.cspf && item.cspf > 0) ||
      /inverter/i.test(item.model || "") ||
      /inverter/i.test(item.type || "") ||
      /inverter/i.test(item.brand || "") ||
      /inverter/i.test(item.category || "") ||
      item.star_rating === 5
    );

    const incomingPayload: Partial<UserAppliance> = {
      name: `${item.brand} ${item.model}`,
      category: item.category,
      brand: item.brand,
      model: item.model,
      control_no: item.control_no,
      watts: watts,
      quantity: 1,
      hours_per_day: 8,
      days_per_month: 30,
      start_hour: getDefaultStartHour(item.category),
      room_location: room,
      energy_rating: `${item.star_rating || 5}-Star (PELP)`,
      is_inverter: isInverter,
      monthly_kwh: monthlyKwh,
      list_id: targetListId,
      tariff_type: targetSpace?.tariff_type || "residential",
    };

    // Check if duplicate already exists in this space
    const existing = appliances.find((a) => {
      const isSameSpace = a.list_id === targetListId || (!a.list_id && spaces.find((s) => s.id === targetListId)?.is_default);
      if (!isSameSpace) return false;

      const isMatchModel =
        a.brand?.trim().toLowerCase() === item.brand?.trim().toLowerCase() &&
        a.model?.trim().toLowerCase() === item.model?.trim().toLowerCase();
      const isMatchName = a.name?.toLowerCase().includes(`${item.brand} ${item.model}`.toLowerCase());
      const isMatchControl = a.control_no && a.control_no === item.control_no;

      return isMatchModel || isMatchName || isMatchControl;
    });

    if (existing) {
      setDuplicateExisting(existing);
      setDuplicateIncoming(incomingPayload);
      setIsDuplicateModalOpen(true);
      return;
    }

    setRoutineModalIncoming(incomingPayload);
    setIsRoutineModalOpen(true);
  };

  const handleCombineQuantity = (existing: UserAppliance) => {
    const newQty = (existing.quantity || 1) + 1;
    updateAppliance(
      {
        resource: "user_appliances",
        id: existing.id,
        values: {
          quantity: newQty,
        },
      },
      {
        onSuccess: () => {
          setImportedControlNo(existing.control_no || existing.id);
          setTimeout(() => setImportedControlNo(null), 3000);
        },
      }
    );
  };

  const handleAddDistinct = (payload: Partial<UserAppliance>) => {
    createAppliance(
      {
        resource: "user_appliances",
        values: payload,
      },
      {
        onSuccess: () => {
          setImportedControlNo(payload.control_no || payload.name || null);
          setTimeout(() => setImportedControlNo(null), 3000);
        },
      }
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* Search & Category Filter */}
      <Grid container spacing={2}>
        {spaces.length > 1 && onSelectedListIdChange && (
          <Grid size={12}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, bgcolor: "action.hover", borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                IMPORT DESTINATION:
              </Typography>
              <TextField
                select
                size="small"
                value={selectedListId}
                onChange={(e) => onSelectedListIdChange(e.target.value)}
                sx={{ minWidth: 260 }}
              >
                {spaces.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {s.tariff_type === "commercial" ? (
                        <StoreIcon fontSize="small" sx={{ color: "secondary.main" }} />
                      ) : (
                        <HomeIcon fontSize="small" sx={{ color: "primary.main" }} />
                      )}
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {s.name}
                      </Typography>
                      <Chip
                        label={s.tariff_type === "commercial" ? "Commercial" : "Residential"}
                        size="small"
                        sx={{ fontSize: "0.6875rem", height: 18 }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Grid>
        )}

        <Grid size={{ xs: 12, sm: 7 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by brand (e.g. Panasonic, Carrier) or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 5 }}>
          <TextField
            select
            fullWidth
            size="small"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {PELP_CATEGORIES.map((cat) => (
              <MenuItem key={cat.slug} value={cat.slug}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* Results List */}
      {loading ? (
        <Box sx={{ py: 8, textAlign: "center" }}>
          <CircularProgress size={36} color="primary" />
          <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 1.5 }}>
            Loading PELP certified models...
          </Typography>
        </Box>
      ) : items.length === 0 ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            No PELP models found matching "{searchQuery}"
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
            Try searching with a broader keyword or select a different appliance category.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
          {items.map((item) => {
            const isImported = importedControlNo === item.control_no;
            const estMonthlyCost = (item.monthly_energy_consumption_kwh || 120) * 14.8261;

            return (
              <Grid size={{ xs: 12, sm: 6 }} key={item.control_no}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                      <Box sx={{ maxWidth: "70%" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {item.brand} {item.model}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                          {item.category}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<StarIcon sx={{ color: "#ffd54f !important", fontSize: "14px !important" }} />}
                        label={`${item.star_rating || 5}-Star`}
                        size="small"
                        color="secondary"
                        sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
                      />
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, my: 1 }}>
                      <Chip
                        label={`${item.power_watts || 750}W`}
                        size="small"
                        sx={{ fontWeight: 700, fontFamily: "monospace", height: 20, fontSize: "0.6875rem" }}
                      />
                      {(item.cspf || item.energy_efficiency_rating) && (
                        <Chip
                          label={`EER: ${item.cspf || item.energy_efficiency_rating}`}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: "0.6875rem" }}
                        />
                      )}
                      <Chip
                        label={`${item.monthly_energy_consumption_kwh || 120} kWh/mo`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.6875rem" }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1.5, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "#ffd54f", fontFamily: "monospace" }}>
                      ~₱{estMonthlyCost.toFixed(2)}/mo
                    </Typography>

                    <Button
                      size="small"
                      variant={isImported ? "contained" : "outlined"}
                      color={isImported ? "success" : "primary"}
                      onClick={() => handleImport(item)}
                      startIcon={isImported ? <CheckCircleIcon /> : <ImportIcon />}
                      sx={{ fontSize: "0.75rem", py: "2px", px: 1.5 }}
                    >
                      {isImported ? "Imported!" : "Add to Space"}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Routine & Target Quota Modal */}
      {isRoutineModalOpen && (
        <ApplianceRoutineModal
          isOpen={isRoutineModalOpen}
          onClose={() => {
            setIsRoutineModalOpen(false);
            setRoutineModalIncoming(null);
          }}
          incomingAppliance={routineModalIncoming}
          spaces={spaces}
          selectedListId={selectedListId}
          onApplianceCreated={(created) => {
            setImportedControlNo(created.control_no || created.name || null);
            setTimeout(() => setImportedControlNo(null), 3000);
          }}
        />
      )}

      {/* Duplicate Appliance Resolution Modal */}
      {isDuplicateModalOpen && (
        <DuplicateApplianceModal
          isOpen={isDuplicateModalOpen}
          onClose={() => {
            setIsDuplicateModalOpen(false);
            setDuplicateIncoming(null);
            setDuplicateExisting(null);
          }}
          incomingAppliance={duplicateIncoming}
          existingAppliance={duplicateExisting}
          spaceName={spaces.find((s) => s.id === (selectedListId || spaces[0]?.id))?.name || "Current Space"}
          onCombineQuantity={handleCombineQuantity}
          onAddDistinct={(payload) => {
            setIsDuplicateModalOpen(false);
            setRoutineModalIncoming(payload);
            setIsRoutineModalOpen(true);
          }}
        />
      )}
    </Box>
  );
};

export default PelpCatalogTabContent;
