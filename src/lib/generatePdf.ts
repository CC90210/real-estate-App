import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * PRODUCTION-GRADE ISOLATED CAPTURE ENGINE
 * This engine creates a hidden iframe sandbox to isolate the capture process 
 * from global CSS bundles that might contain unsupported modern features.
 */

async function createIsolatedCapture(element: HTMLElement): Promise<HTMLCanvasElement> {
    // 1. Create a hidden isolation sandbox
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = element.offsetWidth + 'px';
    iframe.style.height = element.offsetHeight + 'px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Isolation sandbox failed to initialize.");

    // 2. Clone the content into the sandbox
    const clone = element.cloneNode(true) as HTMLElement;

    // 3. Surgical Style Inlining (Compute on original, apply to clone)
    // This is the "Turnkey" secret: we capture styles while the element is alive
    // in the real layout, then fix them for the sandbox.
    const allOriginal = Array.from(element.getElementsByTagName('*'));
    const allCloned = Array.from(clone.getElementsByTagName('*'));

    const inlineStyles = (source: Element, target: Element) => {
        const computed = window.getComputedStyle(source);
        let styleStr = '';

        // Essential PDF Properties
        const props = [
            'color', 'background-color', 'font-family', 'font-size', 'font-weight',
            'line-height', 'text-align', 'padding', 'margin', 'border', 'border-radius',
            'display', 'flex-direction', 'justify-content', 'align-items', 'gap',
            'width', 'height', 'max-width', 'min-width', 'position', 'top', 'left',
            'opacity', 'box-shadow', 'overflow', 'vertical-align', 'list-style'
        ];

        props.forEach(prop => {
            let val = computed.getPropertyValue(prop);
            // Deep Scrub of problematic color functions (lab, oklch)
            if (val.includes('lab(') || val.includes('oklch(') || val.includes('oklab(')) {
                if (prop === 'color') val = '#0f172a';
                else if (prop.includes('background')) val = '#ffffff';
                else val = 'initial';
            }
            if (val) styleStr += `${prop}:${val} !important;`;
        });
        (target as HTMLElement).setAttribute('style', styleStr);
    };

    // Inline the root and all children
    inlineStyles(element, clone);
    allOriginal.forEach((orig, idx) => inlineStyles(orig, allCloned[idx]));

    // 4. Populate sandbox shadow document
    iframeDoc.body.style.margin = '0';
    iframeDoc.body.appendChild(clone);

    // 5. High-Precision Capture
    try {
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            // The sandbox document has NO external stylesheets, 
            // making it impossible for the parser to encounter lab() errors
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
