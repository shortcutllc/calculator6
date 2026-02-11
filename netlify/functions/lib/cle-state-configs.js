/**
 * CLE State Configurations — shared lookup for serverless functions.
 * Mirrors src/config/cleStateConfigs.ts for the frontend.
 */

const CLE_STATE_CONFIGS = {
  NY: { code: 'NY', name: 'New York', creditLabel: '1.0 NY Ethics & Professionalism Credit', creditDesc: '1.0 New York CLE credit in Ethics & Professionalism', boardName: 'the New York CLE Board', abbr: 'NY', rulesName: 'New York Rules of Professional Conduct' },
  PA: { code: 'PA', name: 'Pennsylvania', creditLabel: '1.0 PA Ethics & Professionalism Credit', creditDesc: '1.0 Pennsylvania CLE credit in Ethics & Professionalism', boardName: 'the Pennsylvania CLE Board', abbr: 'PA', rulesName: 'Pennsylvania Rules of Professional Conduct' },
  CA: { code: 'CA', name: 'California', creditLabel: '1.0 CA Ethics & Professionalism Credit', creditDesc: '1.0 California CLE credit in Ethics & Professionalism', boardName: 'the California State Bar', abbr: 'CA', rulesName: 'California Rules of Professional Conduct' },
  TX: { code: 'TX', name: 'Texas', creditLabel: '1.0 TX Ethics & Professionalism Credit', creditDesc: '1.0 Texas CLE credit in Ethics & Professionalism', boardName: 'the Texas State Bar CLE Committee', abbr: 'TX', rulesName: 'Texas Disciplinary Rules of Professional Conduct' },
  FL: { code: 'FL', name: 'Florida', creditLabel: '1.0 FL Ethics & Professionalism Credit', creditDesc: '1.0 Florida CLE credit in Ethics & Professionalism', boardName: 'the Florida Bar', abbr: 'FL', rulesName: 'Florida Rules of Professional Conduct' },
};

function getCLEStateConfig(code) {
  if (!code) return CLE_STATE_CONFIGS.NY;
  return CLE_STATE_CONFIGS[code.toUpperCase()] || CLE_STATE_CONFIGS.NY;
}

export { CLE_STATE_CONFIGS, getCLEStateConfig };
