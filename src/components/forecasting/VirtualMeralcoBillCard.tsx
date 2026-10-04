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
import { SectionCard } from "../common/SectionCard";
import { tokens } from "../../theme/tokens";

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
    <SectionCard
      dataTour="forecasting-virtual-bill"
      infoTooltip={
        language === "tl"
          ? "Isang simulated digital twin ng opisyal na buwanang Meralco bill, na nagpapakita ng eksaktong unbundled charges at lifeline subsidy batay sa iyong prediksyon."
          : "A simulated digital twin of an official monthly Meralco electricity statement, showing exact unbundled charges and Lifeline Subsidy qualification status based on your projected load."
      }
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BillIcon sx={{ color: "text.primary", fontSize: 18 }} />
          <span>
            {language === "tl"
              ? "Talaan ng Tinatayang Bill sa Meralco (Unbundled Virtual Bill)"
              : 'Projected Meralco Statement Breakdown ("Virtual Bill")'}
          </span>
        </Box>
      }
      subtitle={
        language === "tl"
          ? `Eksaktong unbundled ERC tariff computation para sa ${activeMonthName} batay sa iyong kabuuang prediksyon.`
          : `Official ERC unbundled cost decomposition for ${activeMonthName} based on projected load.`
      }
      headerActions={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Chip
            icon={isCommercial ? <BuildingIcon sx={{ fontSize: 14 }} /> : <HomeIcon sx={{ fontSize: 14 }} />}
            label={isCommercial ? "Commercial General Power" : "Residential (Meralco)"}
            variant="outlined"
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: "0.75rem",
              borderRadius: 0.75,
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? tokens.dark.border : tokens.light.border,
            }}
          />

          {!isCommercial && (
            <Chip
              icon={isLifeline ? <CheckIcon sx={{ fontSize: "14px !important" }} /> : <InfoIcon sx={{ fontSize: "14px !important" }} />}
              label={
                isLifeline
                  ? language === "tl"
                    ? `Lifeline Aktibo (${lifelineBuffer.toFixed(1)} kWh allowance)`
                    : `Lifeline Qualified (${lifelineBuffer.toFixed(1)} kWh buffer)`
                  : "Standard Tariff (>100 kWh)"
              }
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: "0.72rem",
                borderRadius: 0.75,
                bgcolor: (theme) =>
                  isLifeline
                    ? theme.palette.mode === "dark" ? tokens.dark.liveBg : tokens.light.liveBg
                    : theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
                color: (theme) =>
                  isLifeline
                    ? theme.palette.mode === "dark" ? tokens.dark.live : tokens.light.live
                    : "text.secondary",
                border: "1px solid",
                borderColor: (theme) =>
                  isLifeline
                    ? theme.palette.mode === "dark" ? tokens.dark.liveBorder : tokens.light.liveBorder
                    : theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
              }}
            />
          )}
        </Box>
      }
    >
      {/* 2. Color-Segmented Proportion Bar */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
            {language === "tl" ? "Distribusyon ng Bawat Bahagi ng Singil" : "Unbundled Cost Distribution"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "text.primary",
            }}
          >
            {forecastedKwh.toFixed(1)} kWh • ₱{effectiveRate.toFixed(2)}/kWh eff.
          </Typography>
        </Box>

        <Box
          sx={{
            height: 8,
            width: "100%",
            borderRadius: 0.5,
            overflow: "hidden",
            display: "flex",
            bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle),
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle),
          }}
        >
          {/* Generation */}
          <Tooltip title={`Generation Charge: ₱${bill.generationTotal.toFixed(2)} (${genPct}%)`}>
            <Box
              sx={{
                width: `${genPct}%`,
                height: "100%",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[0] : tokens.light.chart[0]),
                transition: "width 0.3s ease",
              }}
            />
          </Tooltip>
          {/* Distribution */}
          <Tooltip title={`Distribution Charge: ₱${bill.distributionTotal.toFixed(2)} (${distPct}%)`}>
            <Box
              sx={{
                width: `${distPct}%`,
                height: "100%",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[1] : tokens.light.chart[1]),
                transition: "width 0.3s ease",
              }}
            />
          </Tooltip>
          {/* Transmission */}
          <Tooltip title={`Transmission Charge: ₱${bill.transmissionTotal.toFixed(2)} (${transPct}%)`}>
            <Box
              sx={{
                width: `${transPct}%`,
                height: "100%",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[3] : tokens.light.chart[3]),
                transition: "width 0.3s ease",
              }}
            />
          </Tooltip>
          {/* Taxes */}
          <Tooltip title={`Government Taxes (VAT & LFT): ₱${taxesTotal.toFixed(2)} (${taxesPct}%)`}>
            <Box
              sx={{
                width: `${taxesPct}%`,
                height: "100%",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[2] : tokens.light.chart[2]),
                transition: "width 0.3s ease",
              }}
            />
          </Tooltip>
          {/* Universal & System Loss */}
          <Tooltip title={`Universal & System Loss: ₱${(bill.universalCharges.total + bill.systemLossTotal).toFixed(2)}`}>
            <Box
              sx={{
                width: `${Math.max(1, sysLossPct + universalPct)}%`,
                height: "100%",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[4] : tokens.light.chart[4]),
                transition: "width 0.3s ease",
              }}
            />
          </Tooltip>
        </Box>

        {/* Legend */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[0] : tokens.light.chart[0]),
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                Generation ({genPct}%)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[1] : tokens.light.chart[1]),
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                Distribution ({distPct}%)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[3] : tokens.light.chart[3]),
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                Transmission ({transPct}%)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[2] : tokens.light.chart[2]),
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                Taxes/VAT ({taxesPct}%)
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? tokens.dark.chart[4] : tokens.light.chart[4]),
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
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
          borderRadius: 1,
          bgcolor: "transparent",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle,
        }}
      >
        <Table size="small">
          <TableBody>
            {/* Generation Charge */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <ElectricBoltIcon sx={{ color: (theme) => theme.palette.mode === "dark" ? tokens.dark.chart[0] : tokens.light.chart[0], fontSize: 16 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {language === "tl" ? "Singil sa Henerasyon" : "Generation Charge"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {language === "tl"
                        ? "Pass-through sa mga planta at WESM spot market (walang tubo ang Meralco)"
                        : "Pass-through fuel & wholesale WESM market cost"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  ₱{bill.generationTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {genPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Transmission Charge */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <PowerIcon sx={{ color: (theme) => theme.palette.mode === "dark" ? tokens.dark.chart[3] : tokens.light.chart[3], fontSize: 16 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {language === "tl" ? "Singil sa Transmisyon" : "Transmission Charge"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {language === "tl"
                        ? "Ibinabayad sa National Grid Corporation of the Philippines (NGCP)"
                        : "High-voltage grid delivery paid to NGCP"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  ₱{bill.transmissionTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {transPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Distribution Charge */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <BuildingIcon sx={{ color: (theme) => theme.palette.mode === "dark" ? tokens.dark.chart[1] : tokens.light.chart[1], fontSize: 16 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {language === "tl" ? "Singil sa Distribusyon" : "Distribution Charge (Meralco)"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {language === "tl"
                        ? `Meralco poles, wires, metering (₱${bill.meteringCharge.toFixed(2)}), at supply (₱${bill.supplyCharge.toFixed(2)})`
                        : `Distribution, Supply (₱${bill.supplyCharge.toFixed(2)}), and Metering (₱${bill.meteringCharge.toFixed(2)})`}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  ₱{bill.distributionTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {distPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* System Loss Charge */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <LossIcon sx={{ color: (theme) => theme.palette.mode === "dark" ? tokens.dark.chart[4] : tokens.light.chart[4], fontSize: 16 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {language === "tl" ? "Singil sa Pagkawala ng Sistema" : "System Loss Charge"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {language === "tl"
                        ? "Teknikal at grid recovery loss alinsunod sa itinakdang limit ng ERC"
                        : "Technical and non-technical grid recovery mandated by ERC"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  ₱{bill.systemLossTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {sysLossPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Government Taxes & VAT */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <GovIcon sx={{ color: (theme) => theme.palette.mode === "dark" ? tokens.dark.chart[2] : tokens.light.chart[2], fontSize: 16 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {language === "tl" ? "Mga Buwis sa Pamahalaan" : "Government Taxes & Levies"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {language === "tl"
                        ? "12% Value Added Tax (VAT), Local Franchise Tax, at Real Property Tax"
                        : "12% Value Added Tax (VAT), Local Franchise Tax (LFT), and RPT"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  ₱{taxesTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {taxesPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Universal Charges & Subsidies */}
            <TableRow>
              <TableCell sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <ShieldIcon sx={{ color: "text.secondary", fontSize: 16 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {language === "tl" ? "Universal Charges at Subsidies" : "Universal Charges & Subsidies"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      {language === "tl"
                        ? "Missionary electrification, stranded debts, at FIT-All renewable subsidy"
                        : "Missionary electrification, FIT-All renewable energy, and subsidies"}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ py: 1.25, borderColor: (theme) => theme.palette.mode === "dark" ? tokens.dark.borderSubtle : tokens.light.borderSubtle }}>
                <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  ₱{(bill.universalCharges.total + fitAllTotal + bill.lifelineSubsidy).toFixed(2)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {universalPct}%
                </Typography>
              </TableCell>
            </TableRow>

            {/* Total Row */}
            <TableRow
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? tokens.dark.surfaceSubtle : tokens.light.surfaceSubtle,
              }}
            >
              <TableCell sx={{ py: 1.5, borderBottom: "none" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
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
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: "text.primary",
                  }}
                >
                  ₱{bill.totalBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  ₱{effectiveRate.toFixed(4)} / kWh
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </SectionCard>
  );
};

export default VirtualMeralcoBillCard;
