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
  // NOTE: Shortcut is CLE-accredited ONLY in NY, FL, PA. CA and TX configs were
  // removed (we are not accredited there — their landing pages claimed State Bar
  // approval we do not have). Do not re-add a state until accreditation is real.
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
