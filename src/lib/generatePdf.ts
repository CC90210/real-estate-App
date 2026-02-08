
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Sanitizes a cloned document to remove modern CSS features that break html2canvas 
 * (like lab(), oklch(), etc.)
 */
function sanitizeForCanvas(doc: Document) {
    // Stage 1: Aggressive Stylesheet Purge
    // html2canvas parses ALL stylesheets in the document. Even if an element doesn't use a style,
    // if it exists in the CSS bundle, the parser might crash.
    const styles = doc.getElementsByTagName('style');
    for (let i = 0; i < styles.length; i++) {
        const style = styles[i];
        if (style.textContent) {
            // Replace any lab(), oklch(), oklab() with safe fallbacks (slate-900 or transparent)
            style.textContent = style.textContent
                .replace(/lab\([^)]+\)/g, '#0f172a')
                .replace(/oklch\([^)]+\)/g, '#0f172a')
                .replace(/oklab\([^)]+\)/g, '#0f172a');
        }
    }

    // Stage 2: Inline Element Overrides
    const allElements = doc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;

        // Scan common color properties
        const colorProps = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];

        // We use the raw style check first because getComputedStyle might already fail if the browser doesn't handle the value
        colorProps.forEach(prop => {
            // Attempt to read the computed value safely
            try {
                const computed = window.getComputedStyle(el);
                const val = computed.getPropertyValue(prop);

                if (val && (val.includes('lab(') || val.includes('oklch(') || val.includes('oklab('))) {
                    if (prop === 'color') el.style.setProperty(prop, '#0f172a', 'important');
                    else if (prop === 'backgroundColor') el.style.setProperty(prop, '#f8fafc', 'important');
                    else el.style.setProperty(prop, '#cbd5e1', 'important');
                }
            } catch (e) {
                // If computed style fails, assume it's a problematic value and force fallback
                el.style.setProperty(prop, '#0f172a', 'important');
            }
        });

        // Background gradients often cause crashes
        try {
            const computed = window.getComputedStyle(el);
            const bgImg = computed.backgroundImage;
            if (bgImg && (bgImg.includes('lab(') || bgImg.includes('oklch(') || bgImg.includes('oklab('))) {
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('background-color', '#f8fafc', 'important');
            }
        } catch (e) { }
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
