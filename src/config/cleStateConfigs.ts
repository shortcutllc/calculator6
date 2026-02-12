export interface StateConfig {
  code: string;
  name: string;
  creditLabel: string;
  creditDesc: string;
  boardName: string;
  abbr: string;
  sealImage: string;
  sealAlt: string;
  rulesName: string;
}

export const CLE_STATE_CONFIGS: Record<string, StateConfig> = {
  NY: {
    code: 'NY', name: 'New York',
    creditLabel: '1.0 NY Ethics & Professionalism Credit',
    creditDesc: '1.0 New York CLE credit in Ethics & Professionalism',
    boardName: 'the New York CLE Board',
    abbr: 'NY',
    sealImage: '/ny-state-seal.png',
    sealAlt: 'Seal of the State of New York',
    rulesName: 'New York Rules of Professional Conduct',
  },
  PA: {
    code: 'PA', name: 'Pennsylvania',
    creditLabel: '1.0 PA Ethics Credit',
    creditDesc: '1.0 Pennsylvania CLE credit in Ethics',
    boardName: 'the Pennsylvania CLE Board',
    abbr: 'PA',
    sealImage: '/pa-state-seal.png',
    sealAlt: 'Seal of the Commonwealth of Pennsylvania',
    rulesName: 'Pennsylvania Rules of Professional Conduct',
  },
  CA: {
    code: 'CA', name: 'California',
    creditLabel: '1.0 CA Ethics & Professionalism Credit',
    creditDesc: '1.0 California CLE credit in Ethics & Professionalism',
    boardName: 'the California State Bar',
    abbr: 'CA',
    sealImage: '/ca-state-seal.png',
    sealAlt: 'Seal of the State of California',
    rulesName: 'California Rules of Professional Conduct',
  },
  TX: {
    code: 'TX', name: 'Texas',
    creditLabel: '1.0 TX Ethics & Professionalism Credit',
    creditDesc: '1.0 Texas CLE credit in Ethics & Professionalism',
    boardName: 'the Texas State Bar CLE Committee',
    abbr: 'TX',
    sealImage: '/tx-state-seal.png',
    sealAlt: 'Seal of the State of Texas',
    rulesName: 'Texas Disciplinary Rules of Professional Conduct',
  },
  FL: {
    code: 'FL', name: 'Florida',
    creditLabel: '1.0 FL Ethics & Professionalism Credit',
    creditDesc: '1.0 Florida CLE credit in Ethics & Professionalism',
    boardName: 'the Florida Bar',
    abbr: 'FL',
    sealImage: '/fl-state-seal.png',
    sealAlt: 'Seal of the State of Florida',
    rulesName: 'Florida Rules of Professional Conduct',
  },
};

export function getCLEStateConfig(code?: string): StateConfig {
  if (!code) return CLE_STATE_CONFIGS.NY;
  return CLE_STATE_CONFIGS[code.toUpperCase()] || CLE_STATE_CONFIGS.NY;
}
