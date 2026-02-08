
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Sanitizes a cloned document to remove modern CSS features that break html2canvas 
 * (like lab(), oklch(), etc.)
 */
function sanitizeForCanvas(doc: Document) {
    // Stage 1: Nuclear String Purge
    // We target the entire document's HTML string to catch any lab/oklch/oklab 
    // that might be hidden in style attributes, classes, or external references.
    try {
        const rawHTML = doc.documentElement.innerHTML;
        const sanitizedHTML = rawHTML
            .replace(/lab\([^)]+\)/g, '#0f172a')
            .replace(/oklch\([^)]+\)/g, '#0f172a')
            .replace(/oklab\([^)]+\)/g, '#0f172a');
        doc.documentElement.innerHTML = sanitizedHTML;
    } catch (e) {
        console.warn("Manual innerHTML sanitization failed, falling back to traversal.");
    }

    // Stage 2: External Link Purge
    // html2canvas tries to parse external CSS. If those files contain 'lab()', it crashes.
    // By removing links, we force it to rely on the already computed styles we've inline-sanitized.
    const links = doc.getElementsByTagName('link');
    for (let i = links.length - 1; i >= 0; i--) {
        const link = links[i];
        if (link.rel === 'stylesheet') {
            link.parentNode?.removeChild(link);
        }
    }

    // Stage 3: Deep Element Sanitization (Recursive defense)
    const allElements = doc.getElementsByTagName('*');
    for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;

        // Force fallback for common properties just in case
        const colorProps = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];

        colorProps.forEach(prop => {
            try {
                const style = (el.style as any)[prop];
                if (style && (style.includes('lab(') || style.includes('oklch(') || style.includes('oklab('))) {
                    el.style.setProperty(prop, prop === 'color' ? '#0f172a' : '#ffffff', 'important');
                }

                // Also check computed style as a last resort
                const computed = window.getComputedStyle(el);
                const val = computed.getPropertyValue(prop);
                if (val && (val.includes('lab(') || val.includes('oklch(') || val.includes('oklab('))) {
                    el.style.setProperty(prop, prop === 'color' ? '#0f172a' : '#ffffff', 'important');
                }
            } catch (e) { }
        });

        // Background gradients are notoriously problematic
        if (el.style.backgroundImage && (el.style.backgroundImage.includes('lab(') || el.style.backgroundImage.includes('oklch('))) {
            el.style.setProperty('background-image', 'none', 'important');
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
