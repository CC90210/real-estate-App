
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generatePDFBlob(elementId: string): Promise<Blob | null> {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            ignoreElements: (element) => {
                // Ignore elements that might cause color parsing issues if necessary
                // or specific classes known to break html2canvas
                return false;
            },
            onclone: (document) => {
                // Clean up any potential problematic styles in the clone
                const allElements = document.getElementsByTagName('*');
                for (let i = 0; i < allElements.length; i++) {
                    const style = window.getComputedStyle(allElements[i]);
                    if (style.color && style.color.includes('lab(')) {
                        // Fallback for lab colors if detected
                        (allElements[i] as HTMLElement).style.color = '#000000';
                    }
                }
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
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'letter'
        });

        const imgWidth = 8.5;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // If height is more than one page, we might need to handle pagination, 
        // but for summaries, one page is usually enough or jspdf will handle basic scaling.
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${filename}.pdf`);
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
}
