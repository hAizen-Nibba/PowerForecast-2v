import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'public', 'rates.json');

const S3_BASE_URL = 'https://meralcomain.s3.ap-southeast-1.amazonaws.com';

function getPdfUrl(year, month) {
  const mm = String(month).padStart(2, '0');
  return `${S3_BASE_URL}/${year}-${mm}/${mm}-${year}_residential_bills.pdf`;
}

async function fetchPdfBuffer(url) {
  console.log(`Checking PDF: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) {
      console.log(`Status ${res.status}: Not available`);
      return null;
    }
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error(`Fetch error for ${url}:`, err.message);
    return null;
  }
}

async function parsePdfRates(pdfBuffer) {
  if (!pdfBuffer) return null;
  const parser = new PDFParse({ data: pdfBuffer });
  const textResult = await parser.getText();
  const text = typeof textResult === 'string' ? textResult : (textResult.text || '');

  // Look for the rate table
  // "For Non-Lifeline Customers" followed by lines with kWh numbers and rate per kWh
  const nonLifelineIdx = text.lastIndexOf('For Non-Lifeline Customers');
  if (nonLifelineIdx === -1) {
    console.warn('Could not locate "For Non-Lifeline Customers" section');
    return null;
  }

  const section = text.substring(nonLifelineIdx);
  const lines = section.split('\n');

  // Match lines starting with a standard kWh bracket e.g. "200 9.7032 ... 14.7424"
  // Format usually: kWh, genRate, trans, ... totalRate (last token)
  const entries = [];
  const targetKwhList = [50, 70, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 3000, 5000];

  for (const line of lines) {
    const trimmed = line.trim();
    const tokens = trimmed.split(/\s+/).map(t => t.replace(/,/g, ''));
    if (!tokens.length) continue;

    const firstNum = parseInt(tokens[0], 10);
    if (targetKwhList.includes(firstNum)) {
      // Find generation rate (token 1) and total rate (last token)
      const genRate = parseFloat(tokens[1]);
      const lastToken = tokens[tokens.length - 1];
      const totalRate = parseFloat(lastToken);

      if (!isNaN(genRate) && !isNaN(totalRate)) {
        // Prevent duplicate brackets if table repeats in text
        if (!entries.some(e => e.kwh === firstNum)) {
          entries.push({
            kwh: firstNum,
            rate: totalRate,
            generation_rate: genRate,
          });
        }
      }
    }
  }

  // Sort by kWh
  entries.sort((a, b) => a.kwh - b.kwh);
  return entries;
}

async function main() {
  console.log('--- Meralco Automated Rates Updater ---');
  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth() + 1; // 1 - 12

  let currentBuffer = null;
  let currentUrl = '';
  let resolvedDateStr = '';
  let warningMessage = null;

  // Try current month
  currentUrl = getPdfUrl(currentYear, currentMonth);
  currentBuffer = await fetchPdfBuffer(currentUrl);

  if (!currentBuffer) {
    // Fall back to previous month
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('en-US', { month: 'long' });
    const prevMonthName = new Date(prevYear, prevMonth - 1).toLocaleString('en-US', { month: 'long' });
    warningMessage = `${monthName} ${currentYear} rates not yet published. Using ${prevMonthName} ${prevYear} rates.`;
    console.log(warningMessage);

    currentUrl = getPdfUrl(prevYear, prevMonth);
    currentBuffer = await fetchPdfBuffer(currentUrl);
    currentMonth = prevMonth;
    currentYear = prevYear;
  }

  if (!currentBuffer) {
    console.error('Failed to download Meralco billing PDF from S3.');
    process.exit(1);
  }

  resolvedDateStr = `${String(currentMonth).padStart(2, '0')}/${currentYear}`;
  console.log(`Parsing rates for ${resolvedDateStr}...`);
  const currentEntries = await parsePdfRates(currentBuffer);

  if (!currentEntries || currentEntries.length === 0) {
    console.error('Failed to parse current rates from PDF.');
    process.exit(1);
  }

  // Fetch month before that for Month-over-Month trend
  let priorMonth = currentMonth - 1;
  let priorYear = currentYear;
  if (priorMonth === 0) {
    priorMonth = 12;
    priorYear -= 1;
  }
  const priorUrl = getPdfUrl(priorYear, priorMonth);
  const priorBuffer = await fetchPdfBuffer(priorUrl);
  const priorEntries = priorBuffer ? await parsePdfRates(priorBuffer) : null;
  const priorMap = new Map((priorEntries || []).map(e => [e.kwh, e.rate]));

  // Compute delta and build output
  const data = currentEntries.map(entry => {
    const prevRate = priorMap.get(entry.kwh);
    let rateChange = null;
    let rateChangePercent = null;
    let trend = null;

    if (prevRate !== undefined) {
      rateChange = Math.round((entry.rate - prevRate) * 10000) / 10000;
      rateChangePercent = Math.round(((entry.rate - prevRate) / prevRate) * 10000) / 100;
      trend = rateChange > 0 ? 'up' : rateChange < 0 ? 'down' : 'stable';
    }

    return {
      kwh: entry.kwh,
      rate: entry.rate,
      generation_rate: entry.generation_rate,
      rate_change: rateChange,
      rate_change_percent: rateChangePercent,
      trend,
    };
  });

  const outputPayload = {
    success: true,
    error: null,
    warning: warningMessage,
    date: resolvedDateStr,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      source: currentUrl,
    }
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log(`Successfully updated ${OUTPUT_FILE}`);
  console.log(`Baseline 200 kWh: ₱${data.find(d => d.kwh === 200)?.rate}/kWh (Gen: ₱${data.find(d => d.kwh === 200)?.generation_rate}/kWh)`);
}

main().catch(err => {
  console.error('Error in updater:', err);
  process.exit(1);
});
