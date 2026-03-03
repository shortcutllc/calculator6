/**
 * Lower Pyne Associates LP — Financial Model Generator
 * Generates a professional institutional-quality Excel workbook
 * with live formulas across 5 sheets.
 *
 * Usage: npx tsx scripts/generate-lower-pyne-excel.ts
 */

import ExcelJS from 'exceljs';
import path from 'path';

// ─── STYLE CONSTANTS ─────────────────────────────────────────
const NAVY = '1F3864';
const WHITE = 'FFFFFF';
const LIGHT_BLUE = 'DCE6F1';
const LIGHT_GRAY = 'F2F2F2';
const SECTION_BG = 'D9E2F3';
const GREEN = '2E7D32';
const RED = 'C62828';
const AMBER = 'B26A00';

const currencyFmt = '$#,##0';
const currencyFmtNeg = '$#,##0;[Red]($#,##0)';
const pctFmt = '0.00%';
const pctFmt1 = '0.0%';
const ratioFmt = '0.00"x"';
const numberFmt = '#,##0';

function navyHeader(ws: ExcelJS.Worksheet, row: number, cols: number) {
  const r = ws.getRow(row);
  r.font = { bold: true, color: { argb: WHITE }, size: 11 };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  r.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  r.height = 28;
  for (let c = 1; c <= cols; c++) {
    ws.getCell(row, c).border = { bottom: { style: 'medium', color: { argb: NAVY } } };
  }
}

function sectionRow(ws: ExcelJS.Worksheet, row: number, cols: number, label: string) {
  ws.getCell(row, 1).value = label;
  const r = ws.getRow(row);
  r.font = { bold: true, color: { argb: NAVY }, size: 11 };
  r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SECTION_BG } };
  r.height = 24;
  ws.mergeCells(row, 1, row, cols);
}

function totalRow(ws: ExcelJS.Worksheet, row: number, cols: number) {
  ws.getRow(row).font = { bold: true, color: { argb: NAVY }, size: 11 };
  for (let c = 1; c <= cols; c++) {
    ws.getCell(row, c).border = {
      top: { style: 'thin', color: { argb: NAVY } },
      bottom: { style: 'double', color: { argb: NAVY } },
    };
  }
}

function altRowShading(ws: ExcelJS.Worksheet, startRow: number, endRow: number, cols: number) {
  for (let r = startRow; r <= endRow; r++) {
    if ((r - startRow) % 2 === 1) {
      for (let c = 1; c <= cols; c++) {
        const cell = ws.getCell(r, c);
        if (!cell.fill || (cell.fill as ExcelJS.FillPattern).fgColor?.argb !== SECTION_BG) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
        }
      }
    }
  }
}

function editableCell(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
  cell.border = { bottom: { style: 'thin', color: { argb: '4472C4' } } };
}

// ─── DATA ────────────────────────────────────────────────────
const HIST_YEARS = [2015, 2016, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const HIST_REVENUE = [701553, 723045, 759258, 790645, 810355, 797814, 786735, 830028, 851053, 879895];
const HIST_NET_PROFIT = [71919, 183038, 198280, 145699, 284725, 111060, 132508, 339935, 318233, 361829];
const HIST_CASH = [1066800, 1224215, 1418692, 2220528, 2362967, 2004203, 1794405, 1711504, 1676355, 1575348];
const HIST_MORTGAGE = [2903549, 2847476, 2726895, 4399584, 4320759, 4238271, 4152461, 4063196, 3970789, 3874209];
const HIST_DISTRIBUTIONS = [190000, 120000, 230000, 750000, 200000, 210000, 240000, 280000, 280000, 280000];
const HIST_RM = [191983, 97822, 105299, 170768, 95162, 202738, 109318, 47892, 79488, 43801];

const INCOME_DETAIL = {
  headers: ['Base Rents', 'Escalators', 'Other Income (Easement)', 'Electric Income', 'Interest Income'],
  2023: [693082, 125264, 6600, 784, 4298],
  2024: [711323, 128523, 6600, 414, 4193],
  2025: [729970, 140014, 6600, 480, 2830],
};

const EXPENSE_DETAIL = {
  headers: [
    'Electric', 'Water/Sewer', 'Janitorial', 'Snow Removal', 'Grounds Maintenance',
    'Property Management', 'Repairs - A/C', 'Repairs - General', 'Landlord Work',
    'Pest Control', 'Trash Collection', 'Real Estate Tax', 'Insurance',
    'Professional Fees - Accounting', 'Professional Fees - Architecture',
    'Professional Fees - Legal', 'Non-Escalation Miscellaneous', 'Bank Fees',
    'Interest Rate Swap Payment', 'Office Supplies', 'Depreciation',
    'Amortization', 'Mortgage Interest',
  ],
  2023: [13485, 5499, 20350, 5800, 13988, 33015, 14720, 33172, 0, 2060, 3950, 116055, 22310, 4980, 0, 0, 1118, 1912, -130117, 602, 24200, 12400, 292705],
  2024: [14718, 5734, 21816, 6499, 14419, 33971, 24636, 54852, 0, 2235, 4200, 121484, 23603, 4980, 0, 0, 1045, 2049, -139615, 556, 24422, 10930, 299051],
  2025: [18345, 6199, 23864, 15881, 20358, 35083, 6115, 37686, 720, 2459, 4767, 124744, 25699, 4980, 4050, 117, 373, 1976, -99859, 868, 25084, 834, 255110],
};

const TENANTS = [
  { name: 'Hamilton Jewelers', floor: '1st + Basements', sf: 11003, base: 423939, esc: 139911, total: 563850, expires: '02/28/2027', pctRev: 0.643, term: '10yr' },
  { name: 'J Kerney Kuser', floor: '2nd Floor', sf: 1172, base: 62116, esc: 0, total: 62116, expires: '12/31/2026', pctRev: 0.071, term: '5yr' },
  { name: 'GHO Ventures', floor: '2nd Floor', sf: 1172, base: 58014, esc: 420, total: 58434, expires: '06/30/2026', pctRev: 0.067, term: '5yr' },
  { name: 'Rita Allen Foundation', floor: '3rd Floor', sf: 2343, base: 103873, esc: 0, total: 103873, expires: '08/31/2026', pctRev: 0.118, term: '5yr' },
  { name: 'CL Solutions', floor: '3rd Floor', sf: 1770, base: 81970, esc: 0, total: 81970, expires: '12/31/2025', pctRev: 0.093, term: '5yr' },
];

const BALANCE_SHEET = {
  headers: ['Cash on Hand', 'Total Assets', 'Mortgage', 'Total Liabilities', 'Total Capital (Equity)'],
  2023: [1711504, 3366838, 4063196, 4095944, -729106],
  2024: [1676355, 3180491, 3970789, 4021414, -840923],
  2025: [1575348, 3150228, 3874209, 3909322, -759094],
};

const BASE_REVENUE = 879895;
const BASE_TAX = 124744;
const BASE_OTHER_OPEX = 209539;
const PRE_REFI_DS = 255000;
const STARTING_CASH = 1575348;
const MORTGAGE_AT_MATURITY = 3600000;
const PROJ_YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];

// ─── Cell reference tracker for Assumptions sheet ────────────
// We'll track which row each assumption lands on, then build refs like Assumptions!$B$5
const aRef: Record<string, string> = {};
function setARef(name: string, row: number) {
  aRef[name] = `Assumptions!$B$${row}`;
}
// Short helper: returns the Assumptions cell ref string
function A(name: string): string { return aRef[name]; }

// Column letter helper (0=B, 1=C, ...)
function yCol(idx: number): string { return String.fromCharCode(66 + idx); }

// ─── MAIN ────────────────────────────────────────────────────
async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Lower Pyne Associates LP';
  wb.created = new Date();

  // ═══════════════════════════════════════════════════════════
  // SHEET 1: ASSUMPTIONS
  // ═══════════════════════════════════════════════════════════
  const wsA = wb.addWorksheet('Assumptions', { properties: { tabColor: { argb: NAVY } } });
  wsA.columns = [{ width: 38 }, { width: 18 }, { width: 5 }, { width: 38 }, { width: 18 }];

  // Title
  wsA.mergeCells('A1:E1');
  const titleCell = wsA.getCell('A1');
  titleCell.value = 'LOWER PYNE ASSOCIATES LP \u2014 MODEL ASSUMPTIONS';
  titleCell.font = { bold: true, size: 14, color: { argb: WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsA.getRow(1).height = 36;

  wsA.mergeCells('A2:E2');
  wsA.getCell('A2').value = 'Blue cells are editable \u2014 change assumptions to update Projections, Refinancing & Valuation sheets';
  wsA.getCell('A2').font = { italic: true, size: 10, color: { argb: '4472C4' } };
  wsA.getCell('A2').alignment = { horizontal: 'center' };

  let row = 4;

  function addAssumptionSection(title: string, items: [string, number, string, string, boolean?][]) {
    sectionRow(wsA, row, 5, title);
    row++;
    for (const [label, val, fmt, name, locked] of items) {
      wsA.getCell(row, 1).value = label;
      wsA.getCell(row, 1).font = { size: 11, color: { argb: locked ? '666666' : NAVY } };
      const vCell = wsA.getCell(row, 2);
      vCell.value = val;
      vCell.numFmt = fmt;
      vCell.font = { size: 11, bold: !locked, color: { argb: locked ? '666666' : NAVY } };
      if (!locked) editableCell(vCell);
      setARef(name, row);
      row++;
    }
    row++;
  }

  addAssumptionSection('OPERATING ASSUMPTIONS', [
    ['Revenue Growth Rate', 0.03, pctFmt, 'rev_growth'],
    ['Expense Growth Rate', 0.03, pctFmt, 'exp_growth'],
    ['Real Estate Tax Growth Rate', 0.035, pctFmt, 'tax_growth'],
    ['Vacancy Rate', 0, pctFmt, 'vacancy'],
    ['Annual Distributions', 280000, currencyFmt, 'distributions'],
    ['Outside RE Investments / Year', 86667, currencyFmt, 'new_investments'],
  ]);

  addAssumptionSection('REFINANCING ASSUMPTIONS (2029)', [
    ['Refi Interest Rate', 0.0575, pctFmt, 'refi_rate'],
    ['Refi Loan Amount', 5000000, currencyFmt, 'refi_loan'],
    ['Refi Cash-Out Distributed %', 0.45, pctFmt, 'refi_dist_pct'],
    ['Mortgage Balance at Maturity (2029)', MORTGAGE_AT_MATURITY, currencyFmt, 'mort_at_maturity', true],
  ]);

  addAssumptionSection('CASH RESERVE INVESTMENT', [
    ['Cash Reserves Invested %', 0, pctFmt, 'reserve_invest_pct'],
    ['Return on Invested Reserves', 0.045, pctFmt, 'reserve_return_rate'],
  ]);

  addAssumptionSection('VALUATION ASSUMPTIONS', [
    ['Market Value (Low)', 10000000, currencyFmt, 'mkt_val_low'],
    ['Market Value (High)', 12000000, currencyFmt, 'mkt_val_high'],
    ['Annual Appreciation Rate', 0.025, pctFmt, 'appreciation'],
    ['Cap Rate (Bank Underwriting)', 0.07, pctFmt, 'cap_rate'],
    ['Minority Discount (Buyout)', 0.20, pctFmt, 'minority_discount'],
  ]);

  addAssumptionSection('BASE CONSTANTS (DO NOT MODIFY)', [
    ['2025 Base Revenue', BASE_REVENUE, currencyFmt, 'base_revenue', true],
    ['2025 Real Estate Tax', BASE_TAX, currencyFmt, 'base_tax', true],
    ['2025 Other Operating Expenses', BASE_OTHER_OPEX, currencyFmt, 'base_opex', true],
    ['Pre-Refi Annual Debt Service', PRE_REFI_DS, currencyFmt, 'pre_refi_ds', true],
    ['Starting Cash (2025)', STARTING_CASH, currencyFmt, 'starting_cash', true],
    ['Current Mortgage Balance', 3874209, currencyFmt, 'current_mortgage', true],
  ]);

  // Scenario presets reference
  sectionRow(wsA, row, 5, 'SCENARIO PRESETS (REFERENCE ONLY)');
  row++;
  wsA.getCell(row, 1).value = 'Assumption';
  wsA.getCell(row, 2).value = 'Base Case';
  wsA.getCell(row, 3).value = '';
  wsA.getCell(row, 4).value = 'Conservative';
  wsA.getCell(row, 5).value = 'Stress Test';
  navyHeader(wsA, row, 5);
  wsA.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  const presets: [string, number, number, number, string][] = [
    ['Revenue Growth', 0.03, 0.02, 0.01, pctFmt],
    ['Expense Growth', 0.03, 0.035, 0.04, pctFmt],
    ['Tax Growth', 0.035, 0.04, 0.045, pctFmt],
    ['Vacancy', 0, 0.03, 0.08, pctFmt],
    ['Refi Rate', 0.0575, 0.065, 0.07, pctFmt],
    ['Refi Loan', 5000000, 4000000, 3600000, currencyFmt],
    ['Distributions', 280000, 280000, 200000, currencyFmt],
    ['Refi Dist %', 0.45, 0.30, 0, pctFmt],
  ];
  for (const [label, base, cons, stress, fmt] of presets) {
    wsA.getCell(row, 1).value = label;
    wsA.getCell(row, 2).value = base; wsA.getCell(row, 2).numFmt = fmt;
    wsA.getCell(row, 4).value = cons; wsA.getCell(row, 4).numFmt = fmt;
    wsA.getCell(row, 5).value = stress; wsA.getCell(row, 5).numFmt = fmt;
    row++;
  }

  wsA.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  // ═══════════════════════════════════════════════════════════
  // SHEET 2: HISTORICAL
  // ═══════════════════════════════════════════════════════════
  const wsH = wb.addWorksheet('Historical', { properties: { tabColor: { argb: '4472C4' } } });
  const histCols = HIST_YEARS.length;
  wsH.columns = [{ width: 35 }, ...HIST_YEARS.map(() => ({ width: 15 }))];

  wsH.mergeCells(1, 1, 1, histCols + 1);
  wsH.getCell('A1').value = 'LOWER PYNE ASSOCIATES LP \u2014 HISTORICAL PERFORMANCE';
  wsH.getCell('A1').font = { bold: true, size: 14, color: { argb: WHITE } };
  wsH.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  wsH.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  wsH.getRow(1).height = 36;

  row = 3;
  sectionRow(wsH, row, histCols + 1, '10-YEAR SUMMARY (2015\u20132025)');
  row++;
  wsH.getCell(row, 1).value = '';
  HIST_YEARS.forEach((yr, i) => { wsH.getCell(row, i + 2).value = yr; });
  navyHeader(wsH, row, histCols + 1);
  wsH.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  const summaryRows: [string, number[], string, boolean?][] = [
    ['Total Revenue', HIST_REVENUE, currencyFmt],
    ['Net Profit', HIST_NET_PROFIT, currencyFmtNeg, true],
    ['Cash Reserves', HIST_CASH, currencyFmt, true],
    ['Mortgage Balance', HIST_MORTGAGE, currencyFmt],
    ['Partner Distributions', HIST_DISTRIBUTIONS, currencyFmt],
    ['Repairs & Maintenance', HIST_RM, currencyFmt],
  ];
  const sumStart = row;
  for (const [label, data, fmt, bold] of summaryRows) {
    wsH.getCell(row, 1).value = label;
    wsH.getCell(row, 1).font = { size: 11, color: { argb: NAVY }, bold: !!bold };
    data.forEach((v, i) => {
      const cell = wsH.getCell(row, i + 2);
      cell.value = v;
      cell.numFmt = fmt;
      cell.alignment = { horizontal: 'right' };
    });
    row++;
  }
  altRowShading(wsH, sumStart, row - 1, histCols + 1);

  // Rent Roll
  row += 2;
  sectionRow(wsH, row, histCols + 1, 'RENT ROLL \u2014 17,440 SF, 5 TENANTS');
  row++;
  const rrH = ['Tenant', 'Floor', 'SF', 'Base Rent 2025', 'Escalations', 'Total 2025', 'Lease Expires', '% Revenue', 'Renewal Term'];
  rrH.forEach((h, i) => { wsH.getCell(row, i + 1).value = h; });
  navyHeader(wsH, row, rrH.length);
  wsH.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  for (const t of TENANTS) {
    wsH.getCell(row, 1).value = t.name;
    wsH.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
    wsH.getCell(row, 2).value = t.floor;
    wsH.getCell(row, 3).value = t.sf; wsH.getCell(row, 3).numFmt = numberFmt;
    wsH.getCell(row, 4).value = t.base; wsH.getCell(row, 4).numFmt = currencyFmt;
    wsH.getCell(row, 5).value = t.esc; wsH.getCell(row, 5).numFmt = currencyFmt;
    wsH.getCell(row, 6).value = t.total; wsH.getCell(row, 6).numFmt = currencyFmt;
    wsH.getCell(row, 7).value = t.expires;
    wsH.getCell(row, 8).value = t.pctRev; wsH.getCell(row, 8).numFmt = pctFmt1;
    wsH.getCell(row, 9).value = t.term;
    row++;
  }
  wsH.getCell(row, 1).value = 'TOTAL';
  wsH.getCell(row, 3).value = 17440; wsH.getCell(row, 3).numFmt = numberFmt;
  wsH.getCell(row, 4).value = TENANTS.reduce((s, t) => s + t.base, 0); wsH.getCell(row, 4).numFmt = currencyFmt;
  wsH.getCell(row, 5).value = TENANTS.reduce((s, t) => s + t.esc, 0); wsH.getCell(row, 5).numFmt = currencyFmt;
  wsH.getCell(row, 6).value = TENANTS.reduce((s, t) => s + t.total, 0); wsH.getCell(row, 6).numFmt = currencyFmt;
  wsH.getCell(row, 8).value = 1; wsH.getCell(row, 8).numFmt = pctFmt1;
  totalRow(wsH, row, rrH.length);
  row += 2;

  // 3-Year Income Detail
  sectionRow(wsH, row, histCols + 1, '3-YEAR INCOME DETAIL (2023\u20132025)');
  row++;
  wsH.getCell(row, 1).value = ''; wsH.getCell(row, 2).value = 2023; wsH.getCell(row, 3).value = 2024; wsH.getCell(row, 4).value = 2025;
  navyHeader(wsH, row, 4); wsH.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;
  for (let i = 0; i < INCOME_DETAIL.headers.length; i++) {
    wsH.getCell(row, 1).value = INCOME_DETAIL.headers[i];
    wsH.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
    wsH.getCell(row, 2).value = INCOME_DETAIL[2023][i]; wsH.getCell(row, 2).numFmt = currencyFmt;
    wsH.getCell(row, 3).value = INCOME_DETAIL[2024][i]; wsH.getCell(row, 3).numFmt = currencyFmt;
    wsH.getCell(row, 4).value = INCOME_DETAIL[2025][i]; wsH.getCell(row, 4).numFmt = currencyFmt;
    row++;
  }
  wsH.getCell(row, 1).value = 'TOTAL INCOME';
  wsH.getCell(row, 2).value = 830028; wsH.getCell(row, 2).numFmt = currencyFmt;
  wsH.getCell(row, 3).value = 851053; wsH.getCell(row, 3).numFmt = currencyFmt;
  wsH.getCell(row, 4).value = 879895; wsH.getCell(row, 4).numFmt = currencyFmt;
  totalRow(wsH, row, 4);
  row += 2;

  // 3-Year Expense Detail
  sectionRow(wsH, row, histCols + 1, '3-YEAR EXPENSE DETAIL (2023\u20132025)');
  row++;
  wsH.getCell(row, 1).value = ''; wsH.getCell(row, 2).value = 2023; wsH.getCell(row, 3).value = 2024; wsH.getCell(row, 4).value = 2025;
  navyHeader(wsH, row, 4); wsH.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;
  const expStart = row;
  for (let i = 0; i < EXPENSE_DETAIL.headers.length; i++) {
    wsH.getCell(row, 1).value = EXPENSE_DETAIL.headers[i];
    wsH.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
    wsH.getCell(row, 2).value = EXPENSE_DETAIL[2023][i]; wsH.getCell(row, 2).numFmt = currencyFmtNeg;
    wsH.getCell(row, 3).value = EXPENSE_DETAIL[2024][i]; wsH.getCell(row, 3).numFmt = currencyFmtNeg;
    wsH.getCell(row, 4).value = EXPENSE_DETAIL[2025][i]; wsH.getCell(row, 4).numFmt = currencyFmtNeg;
    row++;
  }
  altRowShading(wsH, expStart, row - 1, 4);
  wsH.getCell(row, 1).value = 'TOTAL EXPENSES';
  wsH.getCell(row, 2).value = 493068; wsH.getCell(row, 2).numFmt = currencyFmt;
  wsH.getCell(row, 3).value = 531584; wsH.getCell(row, 3).numFmt = currencyFmt;
  wsH.getCell(row, 4).value = 515452; wsH.getCell(row, 4).numFmt = currencyFmt;
  totalRow(wsH, row, 4);
  row++;
  wsH.getCell(row, 1).value = 'NET PROFIT';
  wsH.getCell(row, 1).font = { bold: true, size: 11, color: { argb: GREEN } };
  wsH.getCell(row, 2).value = 339935; wsH.getCell(row, 2).numFmt = currencyFmt;
  wsH.getCell(row, 3).value = 318233; wsH.getCell(row, 3).numFmt = currencyFmt;
  wsH.getCell(row, 4).value = 361829; wsH.getCell(row, 4).numFmt = currencyFmt;
  totalRow(wsH, row, 4);
  row += 2;

  // Balance Sheet
  sectionRow(wsH, row, histCols + 1, 'BALANCE SHEET SNAPSHOT (2023\u20132025)');
  row++;
  wsH.getCell(row, 1).value = ''; wsH.getCell(row, 2).value = 2023; wsH.getCell(row, 3).value = 2024; wsH.getCell(row, 4).value = 2025;
  navyHeader(wsH, row, 4); wsH.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;
  for (let i = 0; i < BALANCE_SHEET.headers.length; i++) {
    wsH.getCell(row, 1).value = BALANCE_SHEET.headers[i];
    wsH.getCell(row, 1).font = { size: 11, color: { argb: NAVY }, bold: i === BALANCE_SHEET.headers.length - 1 };
    wsH.getCell(row, 2).value = BALANCE_SHEET[2023][i]; wsH.getCell(row, 2).numFmt = currencyFmtNeg;
    wsH.getCell(row, 3).value = BALANCE_SHEET[2024][i]; wsH.getCell(row, 3).numFmt = currencyFmtNeg;
    wsH.getCell(row, 4).value = BALANCE_SHEET[2025][i]; wsH.getCell(row, 4).numFmt = currencyFmtNeg;
    row++;
  }

  wsH.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];

  // ═══════════════════════════════════════════════════════════
  // SHEET 3: PROJECTIONS
  // ═══════════════════════════════════════════════════════════
  const wsP = wb.addWorksheet('Projections', { properties: { tabColor: { argb: GREEN } } });
  const projCols = PROJ_YEARS.length;
  wsP.columns = [{ width: 35 }, ...PROJ_YEARS.map(() => ({ width: 16 }))];

  wsP.mergeCells(1, 1, 1, projCols + 1);
  wsP.getCell('A1').value = 'LOWER PYNE ASSOCIATES LP \u2014 10-YEAR PROJECTIONS';
  wsP.getCell('A1').font = { bold: true, size: 14, color: { argb: WHITE } };
  wsP.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  wsP.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  wsP.getRow(1).height = 36;

  wsP.mergeCells(2, 1, 2, projCols + 1);
  wsP.getCell('A2').value = 'All projections driven by Assumptions sheet \u2014 change inputs there to update';
  wsP.getCell('A2').font = { italic: true, size: 10, color: { argb: '4472C4' } };
  wsP.getCell('A2').alignment = { horizontal: 'center' };

  row = 4;
  sectionRow(wsP, row, projCols + 1, 'OPERATING PROJECTIONS');
  row++;
  wsP.getCell(row, 1).value = '';
  PROJ_YEARS.forEach((yr, i) => { wsP.getCell(row, i + 2).value = yr; });
  navyHeader(wsP, row, projCols + 1);
  wsP.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  const R: Record<string, number> = {}; // row map

  // Gross Revenue
  R.grossRev = row;
  wsP.getCell(row, 1).value = 'Gross Revenue';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (i === 0) {
      c.value = { formula: A('base_revenue'), result: BASE_REVENUE };
    } else {
      c.value = { formula: `${A('base_revenue')}*(1+${A('rev_growth')})^${i}`, result: Math.round(BASE_REVENUE * Math.pow(1.03, i)) };
    }
    c.numFmt = currencyFmt;
  });
  row++;

  // Vacancy Loss
  R.vacLoss = row;
  wsP.getCell(row, 1).value = 'Less: Vacancy Loss';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: RED } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    c.value = { formula: `-${yCol(i)}${R.grossRev}*${A('vacancy')}`, result: 0 };
    c.numFmt = currencyFmtNeg;
  });
  row++;

  // Effective Revenue
  R.effRev = row;
  wsP.getCell(row, 1).value = 'Effective Revenue';
  wsP.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    c.value = { formula: `${yCol(i)}${R.grossRev}+${yCol(i)}${R.vacLoss}`, result: 0 };
    c.numFmt = currencyFmt;
    c.font = { bold: true };
  });
  totalRow(wsP, row, projCols + 1);
  row += 2; // blank line

  // Other OpEx
  R.opex = row;
  wsP.getCell(row, 1).value = 'Other Operating Expenses';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (i === 0) {
      c.value = { formula: A('base_opex'), result: BASE_OTHER_OPEX };
    } else {
      c.value = { formula: `${A('base_opex')}*(1+${A('exp_growth')})^${i}`, result: Math.round(BASE_OTHER_OPEX * Math.pow(1.03, i)) };
    }
    c.numFmt = currencyFmt;
  });
  row++;

  // Real Estate Tax
  R.tax = row;
  wsP.getCell(row, 1).value = 'Real Estate Tax';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (i === 0) {
      c.value = { formula: A('base_tax'), result: BASE_TAX };
    } else {
      c.value = { formula: `${A('base_tax')}*(1+${A('tax_growth')})^${i}`, result: Math.round(BASE_TAX * Math.pow(1.035, i)) };
    }
    c.numFmt = currencyFmt;
  });
  row++;

  // Total Expenses
  R.totalExp = row;
  wsP.getCell(row, 1).value = 'Total Expenses';
  wsP.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    c.value = { formula: `${yCol(i)}${R.opex}+${yCol(i)}${R.tax}`, result: 0 };
    c.numFmt = currencyFmt;
    c.font = { bold: true };
  });
  totalRow(wsP, row, projCols + 1);
  row += 2;

  // NOI
  R.noi = row;
  wsP.getCell(row, 1).value = 'Net Operating Income (NOI)';
  wsP.getCell(row, 1).font = { size: 12, bold: true, color: { argb: GREEN } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    c.value = { formula: `${yCol(i)}${R.effRev}-${yCol(i)}${R.totalExp}`, result: 0 };
    c.numFmt = currencyFmt;
    c.font = { bold: true, size: 12, color: { argb: GREEN } };
  });
  totalRow(wsP, row, projCols + 1);
  row++;

  // Debt Service
  R.ds = row;
  wsP.getCell(row, 1).value = 'Debt Service';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (yr < 2029) {
      c.value = { formula: A('pre_refi_ds'), result: PRE_REFI_DS };
    } else {
      c.value = { formula: `-PMT(${A('refi_rate')}/12,300,${A('refi_loan')})*12`, result: 377464 };
    }
    c.numFmt = currencyFmt;
  });
  row++;

  // FCF
  R.fcf = row;
  wsP.getCell(row, 1).value = 'Free Cash Flow';
  wsP.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    c.value = { formula: `${yCol(i)}${R.noi}-${yCol(i)}${R.ds}`, result: 0 };
    c.numFmt = currencyFmt;
    c.font = { bold: true };
  });
  totalRow(wsP, row, projCols + 1);
  row++;

  // DSCR
  R.dscr = row;
  wsP.getCell(row, 1).value = 'DSCR';
  wsP.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    c.value = { formula: `${yCol(i)}${R.noi}/${yCol(i)}${R.ds}`, result: 0 };
    c.numFmt = ratioFmt;
    c.font = { bold: true, color: { argb: '4472C4' } };
  });
  row += 2;

  // ─── OUTFLOWS & INFLOWS ───
  sectionRow(wsP, row, projCols + 1, 'OUTFLOWS & INFLOWS');
  row++;

  // Distributions
  R.dist = row;
  wsP.getCell(row, 1).value = 'Distributions';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (i === 0) { c.value = 280000; }
    else { c.value = { formula: A('distributions'), result: 280000 }; }
    c.numFmt = currencyFmt;
  });
  row++;

  // Outside RE Investments
  R.outsideInv = row;
  wsP.getCell(row, 1).value = 'Outside RE Investments';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (i === 0) { c.value = 0; }
    else { c.value = { formula: A('new_investments'), result: 86667 }; }
    c.numFmt = currencyFmt;
  });
  row++;

  // Refi Cash-Out Proceeds
  R.refiCash = row;
  wsP.getCell(row, 1).value = 'Refi Cash-Out Proceeds';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: GREEN } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (yr === 2029) {
      c.value = { formula: `MAX(0,${A('refi_loan')}-${A('mort_at_maturity')})`, result: 1400000 };
      c.font = { bold: true, color: { argb: GREEN } };
    } else {
      c.value = 0;
    }
    c.numFmt = currencyFmt;
  });
  row++;

  // Refi Distribution
  R.refiDist = row;
  wsP.getCell(row, 1).value = 'Refi Cash-Out Distribution';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: RED } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (yr === 2029) {
      c.value = { formula: `${yCol(i)}${R.refiCash}*${A('refi_dist_pct')}`, result: 630000 };
      c.font = { bold: true, color: { argb: RED } };
    } else {
      c.value = 0;
    }
    c.numFmt = currencyFmt;
  });
  row++;

  // Invested Reserves (placeholder — will be rewritten after cashPosition row is known)
  R.investRes = row;
  wsP.getCell(row, 1).value = 'Invested Reserves';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    wsP.getCell(row, i + 2).value = 0;
    wsP.getCell(row, i + 2).numFmt = currencyFmt;
  });
  row++;

  // Investment Income (placeholder)
  R.investInc = row;
  wsP.getCell(row, 1).value = 'Investment Income';
  wsP.getCell(row, 1).font = { size: 11, color: { argb: GREEN } };
  PROJ_YEARS.forEach((yr, i) => {
    wsP.getCell(row, i + 2).value = 0;
    wsP.getCell(row, i + 2).numFmt = currencyFmt;
  });
  row += 2;

  // Net to Cash Position
  R.netToCash = row;
  wsP.getCell(row, 1).value = 'Net to Cash Position';
  wsP.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (i === 0) {
      c.value = 0;
    } else {
      c.value = {
        formula: `${yCol(i)}${R.fcf}-${yCol(i)}${R.dist}-${yCol(i)}${R.outsideInv}-${yCol(i)}${R.refiDist}+${yCol(i)}${R.refiCash}+${yCol(i)}${R.investInc}`,
        result: 0,
      };
    }
    c.numFmt = currencyFmtNeg;
    c.font = { bold: true };
  });
  totalRow(wsP, row, projCols + 1);
  row++;

  // Cash Position
  R.cashPos = row;
  wsP.getCell(row, 1).value = 'Cash Position';
  wsP.getCell(row, 1).font = { size: 12, bold: true, color: { argb: NAVY } };
  PROJ_YEARS.forEach((yr, i) => {
    const c = wsP.getCell(row, i + 2);
    if (i === 0) {
      c.value = { formula: A('starting_cash'), result: STARTING_CASH };
    } else {
      c.value = { formula: `${yCol(i - 1)}${R.cashPos}+${yCol(i)}${R.netToCash}`, result: 0 };
    }
    c.numFmt = currencyFmt;
    c.font = { bold: true, size: 12, color: { argb: NAVY } };
  });
  totalRow(wsP, row, projCols + 1);

  // NOW go back and write the real formulas for Invested Reserves & Investment Income
  PROJ_YEARS.forEach((yr, i) => {
    if (i > 0) {
      // Invested Reserves = previous year cash * invest %
      const irCell = wsP.getCell(R.investRes, i + 2);
      irCell.value = { formula: `${yCol(i - 1)}${R.cashPos}*${A('reserve_invest_pct')}`, result: 0 };
      irCell.numFmt = currencyFmt;

      // Investment Income = invested reserves * return rate
      const iiCell = wsP.getCell(R.investInc, i + 2);
      iiCell.value = { formula: `${yCol(i)}${R.investRes}*${A('reserve_return_rate')}`, result: 0 };
      iiCell.numFmt = currencyFmt;
    }
  });

  wsP.views = [{ state: 'frozen', ySplit: 5, xSplit: 1 }];

  // ═══════════════════════════════════════════════════════════
  // SHEET 4: REFINANCING
  // ═══════════════════════════════════════════════════════════
  const wsR = wb.addWorksheet('Refinancing', { properties: { tabColor: { argb: AMBER } } });
  wsR.columns = [{ width: 38 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];

  wsR.mergeCells('A1:E1');
  wsR.getCell('A1').value = 'LOWER PYNE ASSOCIATES LP \u2014 2029 REFINANCING ANALYSIS';
  wsR.getCell('A1').font = { bold: true, size: 14, color: { argb: WHITE } };
  wsR.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  wsR.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  wsR.getRow(1).height = 36;

  row = 3;
  sectionRow(wsR, row, 5, 'REFI PROCEEDS CALCULATION');
  row++;

  // Row-by-row with direct cell refs
  wsR.getCell(row, 1).value = 'New Loan Amount';
  wsR.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  wsR.getCell(row, 2).value = { formula: A('refi_loan'), result: 5000000 };
  wsR.getCell(row, 2).numFmt = currencyFmt;
  const refiLoanRow = row;
  row++;

  wsR.getCell(row, 1).value = 'Less: Mortgage at Maturity';
  wsR.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  wsR.getCell(row, 2).value = { formula: A('mort_at_maturity'), result: MORTGAGE_AT_MATURITY };
  wsR.getCell(row, 2).numFmt = currencyFmt;
  const mortMatRow = row;
  row++;

  wsR.getCell(row, 1).value = 'Net Cash-Out Proceeds';
  wsR.getCell(row, 1).font = { size: 11, bold: true, color: { argb: GREEN } };
  wsR.getCell(row, 2).value = { formula: `MAX(0,B${refiLoanRow}-B${mortMatRow})`, result: 1400000 };
  wsR.getCell(row, 2).numFmt = currencyFmt;
  wsR.getCell(row, 2).font = { bold: true, color: { argb: GREEN } };
  const netCashOutRow = row;
  totalRow(wsR, row, 2);
  row++;

  wsR.getCell(row, 1).value = 'Less: Distribution to Partners';
  wsR.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  wsR.getCell(row, 2).value = { formula: `B${netCashOutRow}*${A('refi_dist_pct')}`, result: 630000 };
  wsR.getCell(row, 2).numFmt = currencyFmt;
  const distRow = row;
  row++;

  wsR.getCell(row, 1).value = 'Retained for Reserves/CapEx';
  wsR.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  wsR.getCell(row, 2).value = { formula: `B${netCashOutRow}-B${distRow}`, result: 770000 };
  wsR.getCell(row, 2).numFmt = currencyFmt;
  wsR.getCell(row, 2).font = { bold: true };
  totalRow(wsR, row, 2);
  row += 2;

  // Debt Service Comparison
  sectionRow(wsR, row, 5, 'DEBT SERVICE COMPARISON');
  row++;
  wsR.getCell(row, 1).value = '';
  wsR.getCell(row, 2).value = 'Pre-Refi (Current)';
  wsR.getCell(row, 3).value = 'Post-Refi (2029+)';
  wsR.getCell(row, 4).value = 'Change';
  navyHeader(wsR, row, 4);
  wsR.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  wsR.getCell(row, 1).value = 'Annual Debt Service';
  wsR.getCell(row, 2).value = { formula: A('pre_refi_ds'), result: PRE_REFI_DS };
  wsR.getCell(row, 2).numFmt = currencyFmt;
  wsR.getCell(row, 3).value = { formula: `-PMT(${A('refi_rate')}/12,300,${A('refi_loan')})*12`, result: 377464 };
  wsR.getCell(row, 3).numFmt = currencyFmt;
  wsR.getCell(row, 4).value = { formula: `C${row}-B${row}`, result: 0 };
  wsR.getCell(row, 4).numFmt = currencyFmtNeg;
  const annDSRow = row;
  row++;

  wsR.getCell(row, 1).value = 'Monthly Payment';
  wsR.getCell(row, 2).value = { formula: `B${annDSRow}/12`, result: 0 };
  wsR.getCell(row, 2).numFmt = currencyFmt;
  wsR.getCell(row, 3).value = { formula: `C${annDSRow}/12`, result: 0 };
  wsR.getCell(row, 3).numFmt = currencyFmt;
  wsR.getCell(row, 4).value = { formula: `C${row}-B${row}`, result: 0 };
  wsR.getCell(row, 4).numFmt = currencyFmtNeg;
  row++;

  // DSCR — reference 2029 NOI from Projections (column F = year index 4)
  wsR.getCell(row, 1).value = 'DSCR (2029 NOI)';
  wsR.getCell(row, 1).font = { bold: true };
  wsR.getCell(row, 2).value = { formula: `Projections!F${R.noi}/B${annDSRow}`, result: 0 };
  wsR.getCell(row, 2).numFmt = ratioFmt;
  wsR.getCell(row, 3).value = { formula: `Projections!F${R.noi}/C${annDSRow}`, result: 0 };
  wsR.getCell(row, 3).numFmt = ratioFmt;
  row += 2;

  // Rate Scenarios
  sectionRow(wsR, row, 5, 'RATE SCENARIO ANALYSIS');
  row++;
  wsR.getCell(row, 1).value = 'Scenario';
  wsR.getCell(row, 2).value = '10-Yr Treasury';
  wsR.getCell(row, 3).value = 'Lender Spread';
  wsR.getCell(row, 4).value = 'All-In Rate';
  wsR.getCell(row, 5).value = 'Annual DS';
  navyHeader(wsR, row, 5);
  wsR.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  const rateScenarios: [string, number, number][] = [
    ['Bull Case', 0.035, 0.0175],
    ['Base Case', 0.04, 0.02],
    ['Bear Case', 0.045, 0.025],
    ['Stress', 0.05, 0.03],
  ];
  for (const [label, treasury, spread] of rateScenarios) {
    wsR.getCell(row, 1).value = label;
    wsR.getCell(row, 2).value = treasury; wsR.getCell(row, 2).numFmt = pctFmt;
    wsR.getCell(row, 3).value = spread; wsR.getCell(row, 3).numFmt = pctFmt;
    wsR.getCell(row, 4).value = { formula: `B${row}+C${row}`, result: treasury + spread };
    wsR.getCell(row, 4).numFmt = pctFmt; wsR.getCell(row, 4).font = { bold: true };
    wsR.getCell(row, 5).value = { formula: `-PMT(D${row}/12,300,${A('refi_loan')})*12`, result: 0 };
    wsR.getCell(row, 5).numFmt = currencyFmt;
    row++;
  }

  // Historical refi waterfall
  row += 2;
  sectionRow(wsR, row, 5, 'LAST REFI CASH WATERFALL (2018 \u2192 2019)');
  row++;
  const waterfall: [string, number, boolean?][] = [
    ['Net Refi Proceeds', 1672688],
    ['Partner Distribution (45%)', -750000],
    ['Outside Investments', -147000],
    ['Capital Improvements', -78000],
    ['Net Retained', 697688, true],
  ];
  for (const [label, val, isBold] of waterfall) {
    wsR.getCell(row, 1).value = label;
    wsR.getCell(row, 1).font = { size: 11, color: { argb: NAVY }, bold: !!isBold };
    wsR.getCell(row, 2).value = val;
    wsR.getCell(row, 2).numFmt = currencyFmtNeg;
    if (isBold) totalRow(wsR, row, 2);
    row++;
  }

  wsR.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  // ═══════════════════════════════════════════════════════════
  // SHEET 5: VALUATION & BUYOUT
  // ═══════════════════════════════════════════════════════════
  const wsV = wb.addWorksheet('Valuation & Buyout', { properties: { tabColor: { argb: '2E7D32' } } });
  wsV.columns = [{ width: 30 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];

  wsV.mergeCells('A1:G1');
  wsV.getCell('A1').value = 'LOWER PYNE ASSOCIATES LP \u2014 VALUATION & BUYOUT ANALYSIS';
  wsV.getCell('A1').font = { bold: true, size: 14, color: { argb: WHITE } };
  wsV.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  wsV.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  wsV.getRow(1).height = 36;

  row = 3;
  sectionRow(wsV, row, 7, 'MARKET VALUATION (2.5% ANNUAL APPRECIATION)');
  row++;
  const mktYears = [2025, 2027, 2029, 2032, 2035];
  wsV.getCell(row, 1).value = '';
  mktYears.forEach((yr, i) => { wsV.getCell(row, i + 2).value = yr; });
  navyHeader(wsV, row, mktYears.length + 1);
  wsV.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  wsV.getCell(row, 1).value = 'Low Estimate';
  wsV.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  mktYears.forEach((yr, i) => {
    const c = wsV.getCell(row, i + 2);
    c.value = { formula: `${A('mkt_val_low')}*(1+${A('appreciation')})^${yr - 2025}`, result: Math.round(10000000 * Math.pow(1.025, yr - 2025)) };
    c.numFmt = currencyFmt;
  });
  row++;

  wsV.getCell(row, 1).value = 'High Estimate';
  wsV.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  mktYears.forEach((yr, i) => {
    const c = wsV.getCell(row, i + 2);
    c.value = { formula: `${A('mkt_val_high')}*(1+${A('appreciation')})^${yr - 2025}`, result: Math.round(12000000 * Math.pow(1.025, yr - 2025)) };
    c.numFmt = currencyFmt;
  });
  row += 2;

  // Bank Underwriting
  sectionRow(wsV, row, 7, 'BANK UNDERWRITING VALUATION (NOI \u00f7 CAP RATE)');
  row++;
  wsV.getCell(row, 1).value = 'Cap Rate';
  wsV.getCell(row, 2).value = 'Bank Value';
  wsV.getCell(row, 3).value = 'Est. Mortgage';
  wsV.getCell(row, 4).value = 'Total Equity';
  wsV.getCell(row, 5).value = '60% Share';
  wsV.getCell(row, 6).value = '20% Share';
  navyHeader(wsV, row, 6);
  wsV.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  const capRates = [0.06, 0.065, 0.07, 0.075, 0.08];
  for (const cr of capRates) {
    wsV.getCell(row, 1).value = cr;
    wsV.getCell(row, 1).numFmt = pctFmt;
    wsV.getCell(row, 1).font = { bold: true };
    // Bank value = 2029 NOI / cap rate
    wsV.getCell(row, 2).value = { formula: `Projections!F${R.noi}/A${row}`, result: 0 };
    wsV.getCell(row, 2).numFmt = currencyFmt;
    wsV.getCell(row, 3).value = 3650000;
    wsV.getCell(row, 3).numFmt = currencyFmt;
    wsV.getCell(row, 4).value = { formula: `B${row}-C${row}`, result: 0 };
    wsV.getCell(row, 4).numFmt = currencyFmt;
    wsV.getCell(row, 4).font = { bold: true };
    wsV.getCell(row, 5).value = { formula: `D${row}*0.6`, result: 0 };
    wsV.getCell(row, 5).numFmt = currencyFmt;
    wsV.getCell(row, 6).value = { formula: `D${row}*0.2`, result: 0 };
    wsV.getCell(row, 6).numFmt = currencyFmt;
    row++;
  }

  row += 2;
  sectionRow(wsV, row, 7, '20% PARTNER BUYOUT \u2014 MARKET BASIS');
  row++;
  wsV.getCell(row, 1).value = 'Market Valuation';
  wsV.getCell(row, 2).value = '20% Gross';
  wsV.getCell(row, 3).value = 'Mortgage (20%)';
  wsV.getCell(row, 4).value = '20% Net Equity';
  wsV.getCell(row, 5).value = 'w/ Minority Discount';
  navyHeader(wsV, row, 5);
  wsV.getCell(row, 1).alignment = { horizontal: 'left' };
  row++;

  for (const val of [10000000, 11000000, 12000000]) {
    wsV.getCell(row, 1).value = val;
    wsV.getCell(row, 1).numFmt = currencyFmt;
    wsV.getCell(row, 2).value = { formula: `A${row}*0.2`, result: val * 0.2 };
    wsV.getCell(row, 2).numFmt = currencyFmt;
    wsV.getCell(row, 3).value = { formula: `${A('current_mortgage')}*0.2`, result: Math.round(3874209 * 0.2) };
    wsV.getCell(row, 3).numFmt = currencyFmt;
    wsV.getCell(row, 4).value = { formula: `B${row}-C${row}`, result: 0 };
    wsV.getCell(row, 4).numFmt = currencyFmt;
    wsV.getCell(row, 4).font = { bold: true };
    wsV.getCell(row, 5).value = { formula: `D${row}*(1-${A('minority_discount')})`, result: 0 };
    wsV.getCell(row, 5).numFmt = currencyFmt;
    wsV.getCell(row, 5).font = { bold: true, color: { argb: GREEN } };
    row++;
  }

  row += 2;
  sectionRow(wsV, row, 7, 'EQUITY SUMMARY');
  row++;

  wsV.getCell(row, 1).value = 'Market Value (Mid-Range)';
  wsV.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  wsV.getCell(row, 2).value = { formula: `(${A('mkt_val_low')}+${A('mkt_val_high')})/2`, result: 11000000 };
  wsV.getCell(row, 2).numFmt = currencyFmt;
  const mktMidRow = row;
  row++;

  wsV.getCell(row, 1).value = 'Less: Mortgage Balance';
  wsV.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  wsV.getCell(row, 2).value = { formula: A('current_mortgage'), result: 3874209 };
  wsV.getCell(row, 2).numFmt = currencyFmt;
  const mortRow = row;
  row++;

  wsV.getCell(row, 1).value = 'Total Equity';
  wsV.getCell(row, 1).font = { size: 11, bold: true, color: { argb: NAVY } };
  wsV.getCell(row, 2).value = { formula: `B${mktMidRow}-B${mortRow}`, result: 0 };
  wsV.getCell(row, 2).numFmt = currencyFmt;
  wsV.getCell(row, 2).font = { bold: true };
  const eqRow = row;
  totalRow(wsV, row, 2);
  row++;

  wsV.getCell(row, 1).value = '60% Share';
  wsV.getCell(row, 1).font = { size: 11, bold: true, color: { argb: GREEN } };
  wsV.getCell(row, 2).value = { formula: `B${eqRow}*0.6`, result: 0 };
  wsV.getCell(row, 2).numFmt = currencyFmt;
  wsV.getCell(row, 2).font = { bold: true, color: { argb: GREEN } };
  row++;

  wsV.getCell(row, 1).value = '20% Share (each)';
  wsV.getCell(row, 1).font = { size: 11, color: { argb: NAVY } };
  wsV.getCell(row, 2).value = { formula: `B${eqRow}*0.2`, result: 0 };
  wsV.getCell(row, 2).numFmt = currencyFmt;

  wsV.views = [{ state: 'frozen', ySplit: 1, xSplit: 0 }];

  // ─── WRITE FILE ────────────────────────────────────────────
  const outPath = path.join(process.cwd(), 'Lower_Pyne_Associates_Financial_Model.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`\n\u2705 Generated: ${outPath}\n`);
  console.log('Sheets:');
  console.log('  1. Assumptions \u2014 edit blue cells to change model inputs');
  console.log('  2. Historical \u2014 10-year actuals, rent roll, P&L detail');
  console.log('  3. Projections \u2014 formula-driven 2025\u20132035 projections');
  console.log('  4. Refinancing \u2014 2029 refi proceeds, debt service, rate scenarios');
  console.log('  5. Valuation & Buyout \u2014 market vs bank value, partner buyout math');
}

generate().catch((err) => {
  console.error('Error generating Excel:', err);
  process.exit(1);
});
