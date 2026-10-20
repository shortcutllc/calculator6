import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const generatePDF = async (elementId: string, filename: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found');
    }

    // Calculate dimensions
    const { width } = element.getBoundingClientRect();
    const scale = 2; // Higher scale for better quality
    const scaledWidth = width * scale;

    // allowTaint stays false. With it on, html2canvas skips its taint check,
    // so one cross-origin frame (a gallery video was the case, 2026-10-20)
    // taints the whole canvas and toDataURL throws "Tainted canvases may not
    // be exported": no PDF at all. Off, an unreadable asset is left blank and
    // the rest of the proposal still exports. useCORS reloads images with
    // CORS. (The V2 viewer no longer uses this: it prints instead.)
    const canvas = await html2canvas(element, {
      scale: scale,
      useCORS: true,
      logging: false,
      allowTaint: false,
      backgroundColor: '#ffffff',
      windowWidth: width,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        // Ensure all elements are visible in cloned document
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.height = 'auto';
          clonedElement.style.overflow = 'visible';
        }
      }
    });

    // JPEG, not PNG: a full V2 proposal at 2x is one tall image, and as a PNG
    // it came out near 150 MB (2026-10-20). High-quality JPEG on the white
    // page keeps text sharp at a size that can be emailed.
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    
    // Use A4 format with proper scaling
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
      compress: true
    });

    // Add image with proper dimensions
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};