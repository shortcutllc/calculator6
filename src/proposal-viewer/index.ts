import { defineCustomElement } from 'vue';
import ProposalViewer from './ProposalViewer.ce.vue';

const ProposalViewerElement = defineCustomElement(ProposalViewer);

customElements.define('proposal-viewer', ProposalViewerElement);

export { ProposalViewerElement };