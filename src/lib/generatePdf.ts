
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
        const style = el.style;

        // Scan common color properties for modern functions that html2canvas cannot parse
        const colorProps = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];

        colorProps.forEach(prop => {
            const val = (el.style as any)[prop];
            if (val && (val.includes('lab(') || val.includes('oklch(') || val.includes('oklab('))) {
                // Fallback to safe colors
                if (prop === 'color') (el.style as any)[prop] = '#0f172a'; // Slate 900
                else if (prop === 'backgroundColor') (el.style as any)[prop] = '#f8fafc'; // Slate 50
                else (el.style as any)[prop] = '#cbd5e1'; // Slate 300
            }
        });

        // Also handle computed styles if needed via inline overrides for problematic elements
        // This is more intensive but ensures computed styles don't break it
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
