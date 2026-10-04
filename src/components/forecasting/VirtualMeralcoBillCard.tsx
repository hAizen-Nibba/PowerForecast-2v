import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import {
  ReceiptLong as BillIcon,
  ElectricBolt as ElectricBoltIcon,
  Power as PowerIcon,
  AccountBalance as GovIcon,
  SyncAlt as LossIcon,
  InfoOutlined as InfoIcon,
  ShieldOutlined as ShieldIcon,
  CheckCircleOutlined as CheckIcon,
  Apartment as BuildingIcon,
  Home as HomeIcon,
} from "@mui/icons-material";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";

interface VirtualMeralcoBillCardProps {
  forecastedKwh: number;
  tariffType: "residential" | "commercial";
  activeMonthName: string;
  language: string;
}

export const VirtualMeralcoBillCard: React.FC<VirtualMeralcoBillCardProps> = ({
  forecastedKwh,
  tariffType,
  activeMonthName,
  language,
}) => {
  const isCommercial = tariffType === "commercial";
  const bill = calculateMeralcoBill(forecastedKwh, undefined, 0, false, tariffType);

  const totalBill = Math.max(0.01, bill.totalBill);
  const taxesTotal = bill.totalVat + bill.localFranchiseTax;
  const effectiveRate = bill.effectiveRatePerKwh;
  const fitAllTotal = bill.fitAll;

  const genPct = Number(((bill.generationTotal / totalBill) * 100).toFixed(1));
  const distPct = Number(((bill.distributionTotal / totalBill) * 100).toFixed(1));
  const transPct = Number(((bill.transmissionTotal / totalBill) * 100).toFixed(1));
  const sysLossPct = Number(((bill.systemLossTotal / totalBill) * 100).toFixed(1));
  const taxesPct = Number(((taxesTotal / totalBill) * 100).toFixed(1));
  const universalPct = Number(
    Math.max(
      0,
      100 - (genPct + distPct + transPct + sysLossPct + taxesPct)
    ).toFixed(1)
  );

  const isLifeline = !isCommercial && forecastedKwh <= 100;
  const lifelineBuffer = Math.max(0, 100 - forecastedKwh);

  return (
    <Card
      data-tour="forecasting-virtual-bill"
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.85)" : "#ffffff",
        boxShadow: (theme) =>
          theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)",
      }}
    >
      {/* 1. Header Bar: Title, Tariff Classification, and Lifeline Badge */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BillIcon sx={{ color: "primary.main" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
              {language === "tl"
                ? "Talaan ng Tinatayang Bill sa Meralco (Unbundled Virtual Bill)"
                : 'Projected Meralco Statement Breakdown ("Virtual Bill")'}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {language === "tl"
              ? `Eksaktong unbundled ERC tariff computation para sa ${activeMonthName} batay sa iyong kabuuang prediksyon.`
              : `Official ERC unbundled cost decomposition for ${activeMonthName} based on projected load.`}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip
            icon={isCommercial ? <BuildingIcon sx={{ fontSize: 16 }} /> : <HomeIcon sx={{ fontSize: 16 }} />}
            label={isCommercial ? "Commercial General Power" : "Residential (Meralco)"}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />

          {!isCommercial && (
            <Chip
              icon={isLifeline ? <CheckIcon sx={{ fontSize: "16px !important" }} /> : <InfoIcon sx={{ fontSize: "16px !important" }} />}
              label={
                isLifeline
                  ? language === "tl"
                    ? `Lifeline Bracket Aktibo (${lifelineBuffer.toFixed(1)} kWh allowance)`
                    : `Lifeline Discount Qualified (${lifelineBuffer.toFixed(1)} kWh buffer)`
                  : language === "tl"
                  ? "Standard Tariff (>100 kWh)"
                  : "Standard Tariff (>100 kWh)"
              }
              color={isLifeline ? "success" : "default"}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
      </Box>

      {/* 2. Color-Segmented Proportion Bar */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
            {language === "tl" ? "Distribusyon ng Bawat Bahagi ng Singil" : "Unbundled Cost Distribution"}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "text.primary" }}>
            {forecastedKwh.toFixed(1)} kWh • ₱{effectiveRate.toFixed(2)}/kWh eff.
          </Typography>
        </Box>

        <Box
          sx={{
            height: 14,
            width: "100%",
            borderRadius: 1.5,
            overflow: "hidden",
            display: "flex",
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0"),
          }}
        >
          {/* Generation */}
          <Tooltip title={`Generation Charge: ₱${bill.generationTotal.toFixed(2)} (${genPct}%)`}>
            <Box sx={{ width: `${genPct}%`, height: "100%", bgcolor: "#00e5c9", transition: "width 0.3s ease" }} />
          </Tooltip>
          {/* Distribution */}
          <Tooltip title={`Distribution Charge: ₱${bill.distributionTotal.toFixed(2)} (${distPct}%)`}>
            <Box sx={{ width: `${distPct}%`, height: "100%", bgcolor: "#3b82f6", transition: "width 0.3s ease" }} />
          </Tooltip>
          {/* Transmission */}
          <Tooltip title={`Transmission Charge: ₱${bill.transmissionTotal.toFixed(2)} (${transPct}%)`}>
            <Box sx={{ width: `${transPct}%`, height: "100%", bgcolor: "#8b5cf6", transition: "width 0.3s ease" }} />
          </Tooltip>
          {/* Taxes */}
          <Tooltip title={`Government Taxes (VAT & LFT): ₱${taxesTotal.toFixed(2)} (${taxesPct}%)`}>
            <Box sx={{ width: `${taxesPct}%`, height: "100%", bgcolor: "#f59e0b", transition: "width 0.3s ease" }} />
          </Tooltip>
          {/* Universal & System Loss */}
          <Tooltip title={`Universal & System Loss: ₱${(bill.universalCharges.total + bill.systemLossTotal).toFixed(2)}`}>
            <Box sx={{ width: `${Math.max(1, sysLossPct + universalPct)}%`, height: "100%", bgcolor: "#10b981", transition: "width 0.3s ease" }} />
          </Tooltip>
        </Box>

        {/* Legend */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "#00e5c9" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Generation ({genPct}%)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "#3b82f6" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Distribution ({distPct}%)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "#8b5cf6" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Transmission ({transPct}%)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "#f59e0b" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Taxes/VAT ({taxesPct}%)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: "#10b981" }} />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Universal/Loss ({universalPct}%)
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* 3. Unbundled Component Breakdown Table */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          borderRadius: 1.25,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#fafafa",
          borderColor: "divider",
        }}
      >
        <Table size="small">
          <TableBody>
            {/* Generation Charge */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ElectricBoltIcon sx={{ color: "#00e5c9", fontSize: 18 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {language === "tl" ? "Singil sa Henerasyon" : "Generation Charge"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl"
                        ? "Pass-through sa mga planta at WESM spot market (walang tubo ang Meralco)"
                        : "Pass-through fuel & wholesale WESM market cost"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  ₱{bill.generationTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {genPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Transmission Charge */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PowerIcon sx={{ color: "#8b5cf6", fontSize: 18 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {language === "tl" ? "Singil sa Transmisyon" : "Transmission Charge"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl"
                        ? "Ibinabayad sa National Grid Corporation of the Philippines (NGCP)"
                        : "High-voltage grid delivery paid to NGCP"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  ₱{bill.transmissionTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {transPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Distribution Charge */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <BuildingIcon sx={{ color: "#3b82f6", fontSize: 18 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {language === "tl" ? "Singil sa Distribusyon" : "Distribution Charge (Meralco)"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl"
                        ? `Meralco poles, wires, metering (₱${bill.meteringCharge.toFixed(2)}), at supply (₱${bill.supplyCharge.toFixed(2)})`
                        : `Distribution, Supply (₱${bill.supplyCharge.toFixed(2)}), and Metering (₱${bill.meteringCharge.toFixed(2)})`}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  ₱{bill.distributionTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {distPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* System Loss Charge */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LossIcon sx={{ color: "#10b981", fontSize: 18 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {language === "tl" ? "Singil sa Pagkawala ng Sistema" : "System Loss Charge"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl"
                        ? "Teknikal at grid recovery loss alinsunod sa itinakdang limit ng ERC"
                        : "Technical and non-technical grid recovery mandated by ERC"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  ₱{bill.systemLossTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {sysLossPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Government Taxes & VAT */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <GovIcon sx={{ color: "#f59e0b", fontSize: 18 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {language === "tl" ? "Mga Buwis sa Pamahalaan" : "Government Taxes & Levies"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl"
                        ? "12% Value Added Tax (VAT), Local Franchise Tax, at Real Property Tax"
                        : "12% Value Added Tax (VAT), Local Franchise Tax (LFT), and RPT"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  ₱{taxesTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {taxesPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Universal Charges & Subsidies */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ShieldIcon sx={{ color: "#10b981", fontSize: 18 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {language === "tl" ? "Universal Charges at Subsidies" : "Universal Charges & Subsidies"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl"
                        ? "Missionary electrification, stranded debts, at FIT-All renewable subsidy"
                        : "Missionary electrification, FIT-All renewable energy, and subsidies"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderBottomColor: "divider" }}>
                <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  ₱{(bill.universalCharges.total + fitAllTotal + bill.lifelineSubsidy).toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {universalPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Total Row */}
            <TableRow
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.08)",
              }}
            >
              <TableCell sx={{ py: 1.5, borderBottom: "none" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.main" }}>
                  {language === "tl" ? "KABUUANG TINATAYANG BILL" : "TOTAL PROJECTED MERALCO BILL"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {forecastedKwh.toFixed(1)} kWh • {activeMonthName}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.5, borderBottom: "none" }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 900,
                    fontFamily: "monospace",
                    color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                  }}
                >
                  ₱{bill.totalBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                  ₱{effectiveRate.toFixed(4)} / kWh
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default VirtualMeralcoBillCard;
