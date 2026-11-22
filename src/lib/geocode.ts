/**
 * Reverse geocodes coordinates to a human-readable address using
 * OpenStreetMap Nominatim with a 4-second timeout and contact User-Agent.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const contactEmail = process.env.DEMO_INBOX_EMAIL || 'civiclens-triage@example.com';
    const response = await fetch(url, {
      headers: {
        'User-Agent': `CivicLens-Triage/1.0 (${contactEmail})`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data || !data.display_name) {
      return null;
    }

    // Prefer shorter structured address components if available
    const addr = data.address;
    if (addr) {
      const parts: string[] = [];
      if (addr.road || addr.pedestrian || addr.street) {
        parts.push(addr.road || addr.pedestrian || addr.street);
      }
      if (addr.neighbourhood || addr.suburb || addr.residential) {
        parts.push(addr.neighbourhood || addr.suburb || addr.residential);
      }
      if (addr.city || addr.town || addr.village || addr.county) {
        parts.push(addr.city || addr.town || addr.village || addr.county);
      }
      if (addr.postcode) {
        parts.push(addr.postcode);
      }

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    return String(data.display_name).slice(0, 200);
  } catch (error) {
    console.warn('Reverse geocoding timed out or failed:', error);
    return null;
  }
}
