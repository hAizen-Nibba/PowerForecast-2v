import { BillBreakdown } from '../types';

export const DEFAULT_MERALCO_RATES = {
  transmission: 1.4074,
  systemLoss: 0.7994,
  distTier1: 0.9803, // 0 - 200 kWh
  distTier2: 1.2908, // 201 - 300 kWh
  distTier3: 1.5837, // 301 - 400 kWh
  distTier4: 2.0941, // 401+ kWh
  meteringFixed: 5.0,
  meteringPerKwh: 0.3350,
  supplyFixed: 16.3800,
  supplyPerKwh: 0.4979,
  awatRefund: -0.4278,
  regReset: -0.0023,
  vatGen: 0.0941,
  vatTrans: 0.1126,
  vatSysLoss: 0.0966,
  vatOthers: 0.1200,
  rptRate: 0.0062,
  lftRate: 0.0050,
  universalRate: 0.3216,
  fitAll: 0.2011,
  lifelineRate: 0.0100,
  seniorRate: 0.0001,
  defaultGenerationRate: 9.2504,
};

export function calculateMeralcoBill(
  kwh: number,
  genRate: number = DEFAULT_MERALCO_RATES.defaultGenerationRate,
  otherCharges: number = 0,
  isSeniorCitizen: boolean = false
): BillBreakdown {
  const safeKwh = Math.max(0, Number(kwh) || 0);
  const safeGenRate = Number(genRate) || DEFAULT_MERALCO_RATES.defaultGenerationRate;
  const safeOther = Math.max(0, Number(otherCharges) || 0);

  const genCost = Math.round(safeKwh * safeGenRate * 100) / 100;
  const transCost = Math.round(safeKwh * DEFAULT_MERALCO_RATES.transmission * 100) / 100;
  const sysLossCost = Math.round(safeKwh * DEFAULT_MERALCO_RATES.systemLoss * 100) / 100;

  // Distribution Tier
  let distRate = DEFAULT_MERALCO_RATES.distTier1;
  if (safeKwh > 400) {
    distRate = DEFAULT_MERALCO_RATES.distTier4;
  } else if (safeKwh > 300) {
    distRate = DEFAULT_MERALCO_RATES.distTier3;
  } else if (safeKwh > 200) {
    distRate = DEFAULT_MERALCO_RATES.distTier2;
  }

  const distCost = Math.round(safeKwh * distRate * 100) / 100;
  const meteringCost = safeKwh === 0 ? 0 : Math.round(safeKwh * DEFAULT_MERALCO_RATES.meteringPerKwh * 100) / 100 + DEFAULT_MERALCO_RATES.meteringFixed;
  const supplyCost = safeKwh === 0 ? 0 : Math.round(safeKwh * DEFAULT_MERALCO_RATES.supplyPerKwh * 100) / 100 + DEFAULT_MERALCO_RATES.supplyFixed;
  const awatRefund = Math.round(safeKwh * DEFAULT_MERALCO_RATES.awatRefund * 100) / 100;
  const regReset = Math.round(safeKwh * DEFAULT_MERALCO_RATES.regReset * 100) / 100;
  const seniorSubsidyCost = Math.round(safeKwh * DEFAULT_MERALCO_RATES.seniorRate * 100) / 100;

  const distTotal = distCost + meteringCost + supplyCost + awatRefund + regReset;

  // VAT calculations
  const genVat = Math.round(genCost * DEFAULT_MERALCO_RATES.vatGen * 100) / 100;
  const transVat = Math.round(transCost * DEFAULT_MERALCO_RATES.vatTrans * 100) / 100;
  const sysLossVat = Math.round(sysLossCost * DEFAULT_MERALCO_RATES.vatSysLoss * 100) / 100;
  const distVat = Math.round(distTotal * DEFAULT_MERALCO_RATES.vatOthers * 100) / 100;
  const seniorVat = Math.round(seniorSubsidyCost * DEFAULT_MERALCO_RATES.vatOthers * 100) / 100;
  const totalVat = genVat + transVat + sysLossVat + distVat + seniorVat;

  // Local Franchise & Real Property Taxes
  const rptCost = Math.round(safeKwh * DEFAULT_MERALCO_RATES.rptRate * 100) / 100;
  const lftBase = genCost + transCost + sysLossCost + distTotal + seniorSubsidyCost + rptCost;
  const lftCost = Math.round(lftBase * DEFAULT_MERALCO_RATES.lftRate * 100) / 100;
  const govTaxesTotal = rptCost + lftCost + totalVat;

  // Universal Charges & FIT-All
  const universalChargesTotal = Math.round(safeKwh * DEFAULT_MERALCO_RATES.universalRate * 100) / 100;
  const fitAllCost = Math.round(safeKwh * DEFAULT_MERALCO_RATES.fitAll * 100) / 100;
  const lifelineCost = Math.round(safeKwh * DEFAULT_MERALCO_RATES.lifelineRate * 100) / 100;
  const nonVatSubsidiesTotal = universalChargesTotal + fitAllCost + lifelineCost;

  let energyAmount = genCost + transCost + sysLossCost + distTotal + seniorSubsidyCost + govTaxesTotal + nonVatSubsidiesTotal;

  // Senior Citizen Discount eligibility (consumption <= 100 kWh)
  let seniorDiscountAmount = 0;
  if (isSeniorCitizen && safeKwh <= 100) {
    seniorDiscountAmount = Math.round(energyAmount * 0.05 * 100) / 100;
    energyAmount -= seniorDiscountAmount;
  }

  const totalBill = Math.max(0, energyAmount + safeOther);
  const effectiveRate = safeKwh > 0 ? totalBill / safeKwh : 0;

  return {
    kwh: safeKwh,
    generationRate: safeGenRate,
    otherCharges: safeOther,
    isSeniorCitizen,
    
    generationTotal: genCost,
    transmissionTotal: transCost,
    systemLossTotal: sysLossCost,
    
    distributionTotal: distTotal,
    distributionCharge: distCost,
    supplyCharge: supplyCost,
    meteringCharge: meteringCost,
    
    lifelineSubsidy: lifelineCost,
    seniorSubsidy: seniorSubsidyCost,
    isLifelineEligible: safeKwh <= 100,
    
    universalCharges: {
      missionary: Math.round(safeKwh * 0.1544 * 100) / 100,
      environmental: Math.round(safeKwh * 0.0025 * 100) / 100,
      strandedDebts: Math.round(safeKwh * 0.0428 * 100) / 100,
      npcStrandedCont: Math.round(safeKwh * 0.1200 * 100) / 100,
      redci: Math.round(safeKwh * 0.0019 * 100) / 100,
      total: universalChargesTotal,
    },
    fitAll: fitAllCost,
    
    generationVat: genVat,
    transmissionVat: transVat,
    systemLossVat: sysLossVat,
    distributionVat: distVat,
    otherVat: seniorVat,
    totalVat: totalVat,
    localFranchiseTax: lftCost,
    
    subtotalBeforeTaxes: genCost + transCost + sysLossCost + distTotal + nonVatSubsidiesTotal,
    totalTaxesAndSubsidies: govTaxesTotal + nonVatSubsidiesTotal,
    totalBill: Math.round(totalBill * 100) / 100,
    effectiveRatePerKwh: Math.round(effectiveRate * 10000) / 10000,
  };
}
