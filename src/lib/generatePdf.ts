import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * PRODUCTION-GRADE ISOLATED CAPTURE ENGINE
 * This engine creates a hidden iframe sandbox to isolate the capture process 
 * from global CSS bundles that might contain unsupported modern features.
 */

async function createIsolatedCapture(element: HTMLElement): Promise<HTMLCanvasElement> {
    // 1. Create a hidden isolation sandbox with fixed high-fidelity dimensions
    // We use a fixed width of 1200px for high-density rendering during capture
    const captureWidth = 1200;
    const ratio = element.offsetHeight / element.offsetWidth;
    const captureHeight = captureWidth * ratio;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '-9999px'; // Move way off screen
    iframe.style.width = captureWidth + 'px';
    iframe.style.height = captureHeight + 'px';
    iframe.style.border = 'none';
    iframe.style.background = 'white';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Isolation sandbox failed to initialize.");

    // 2. Mirror & Scrub ALL Global Styles (Nuclear Recovery)
    // Instead of inlining (which fails on complexity), we mirror the entire CSS architecture
    let mirrorStyles = '';

    // Capture from <style> tags
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => {
        mirrorStyles += tag.innerHTML;
    });

    // Capture from <link> sheets (if accessible)
    for (let i = 0; i < document.styleSheets.length; i++) {
        const sheet = document.styleSheets[i];
        try {
            if (sheet.cssRules) {
                for (let j = 0; j < sheet.cssRules.length; j++) {
                    mirrorStyles += sheet.cssRules[j].cssText;
                }
            }
        } catch (e) {
            console.warn("Could not mirror external stylesheet. PDF may lack some branding styles.", e);
        }
    }

    // Surgical Scrub: Remove all modern features that crash html2canvas/PDF engines
    // We target lab(), oklch(), and other v4-specific color functions
    const scrubbedStyles = mirrorStyles
        .replace(/lab\([^)]+\)/g, '#0f172a')
        .replace(/oklch\([^)]+\)/g, '#0f172a')
        .replace(/oklab\([^)]+\)/g, '#0f172a')
        .replace(/--[\w-]+:\s*[^;{}]+(?:lab|oklch|oklab)[^;{}]+;/g, ''); // Clear CSS variables using these

    const styleElement = iframeDoc.createElement('style');
    styleElement.innerHTML = scrubbedStyles;
    iframeDoc.head.appendChild(styleElement);

    // 3. Clone and Inject Content
    const clone = element.cloneNode(true) as HTMLElement;

    // Explicitly fix widths for the container to match the capture width
    clone.style.width = '100%';
    clone.style.margin = '0';
    clone.style.padding = '60px'; // Professional margins
    clone.style.boxSizing = 'border-box';
    clone.style.boxShadow = 'none';

    iframeDoc.body.style.margin = '0';
    iframeDoc.body.style.background = 'white';
    iframeDoc.body.appendChild(clone);

    // Give the browser a moment to apply styles to the iframe
    await new Promise(r => setTimeout(r, 300));

    // 4. High-Precision Capture
    try {
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: captureWidth,
            windowWidth: captureWidth, // Force the "viewport" of the capture to match our sandbox
        });

        // Cleanup
        document.body.removeChild(iframe);
        return canvas;
    } catch (e) {
        document.body.removeChild(iframe);
        throw e;
    }
}

export async function generatePDFBlob(elementId: string): Promise<Blob | null> {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
        const canvas = await createIsolatedCapture(element);
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
        console.error('Production PDF Failure:', error);
        throw error;
    }
}

export async function downloadPDF(elementId: string, filename: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const canvas = await createIsolatedCapture(element);
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
        console.error('Manual PDF Failure:', error);
        throw error;
    }
}
