
const CACHE: Record<string, { lat: number; lon: number }> = {};

export async function geocodeLocation(locationName: string): Promise<{ lat: number; lon: number } | null> {
    if (!locationName) return null;

    // Check cache first
    if (CACHE[locationName]) {
        return CACHE[locationName];
    }

    try {
        // Use OpenStreetMap Nominatim API
        // Ideally this should be server-side to avoid CORS issues or keys exposed (though Nominatim is free)
        // Ensure proper User-Agent as per Usage Policy
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`, {
            headers: {
                'User-Agent': 'PropFlow-App/1.0'
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            const result = {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon)
            };
            CACHE[locationName] = result;
            return result;
        }
    } catch (error) {
        console.error("Geocoding failed for", locationName, error);
    }

    return null;
}
