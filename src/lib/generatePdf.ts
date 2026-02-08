
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Sanitizes a cloned document to remove modern CSS features that break html2canvas 
 * (like lab(), oklch(), etc.)
 */
function sanitizeForCanvas(doc: Document) {
    const allElements = doc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;

        // Scan common color properties for modern functions that html2canvas cannot parse
        const colorProps = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];

        // Use getComputedStyle because el.style only reads inline styles
        const computed = window.getComputedStyle(el);

        colorProps.forEach(prop => {
            const val = computed.getPropertyValue(prop);
            if (val && (val.includes('lab(') || val.includes('oklch(') || val.includes('oklab('))) {
                // Force fallback to safe colors via inline style override on the clone
                if (prop === 'color') el.style.setProperty(prop, '#0f172a', 'important'); // Slate 900
                else if (prop === 'backgroundColor') el.style.setProperty(prop, '#f8fafc', 'important'); // Slate 50
                else el.style.setProperty(prop, '#cbd5e1', 'important'); // Slate 300
            }
        });

        // Also fix background-image if it uses gradients with modern colors
        const bgImg = computed.backgroundImage;
        if (bgImg && (bgImg.includes('lab(') || bgImg.includes('oklch(') || bgImg.includes('oklab('))) {
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('background-color', '#f8fafc', 'important');
        }
    }
}

export async function generatePDFBlob(elementId: string): Promise<Blob | null> {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                sanitizeForCanvas(clonedDoc);
            }
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'letter'
        });

        const imgWidth = 8.5;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        return pdf.output('blob');
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
}

export async function downloadPDF(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                sanitizeForCanvas(clonedDoc);
            }
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'letter'
        });

        const imgWidth = 8.5;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
}
