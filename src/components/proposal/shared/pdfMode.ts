import { createContext, useContext } from 'react';

// PDF mode: true while the V2 viewer renders its still, client-review
// version for "Download PDF" (StandaloneProposalViewerV2 handleDownloadPdf).
// Components with their own expand/collapse state read it to show their
// content in full and drop on-screen controls (Read more, Quick view,
// photo counters, Ask us anything). Styling for the mode lives under
// `.pv-static` in proposal-refresh.css.
export const PdfModeContext = createContext(false);
export const usePdfMode = (): boolean => useContext(PdfModeContext);
