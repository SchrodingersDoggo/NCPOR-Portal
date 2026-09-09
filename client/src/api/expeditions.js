import api from './client.js';

// The globe needs: id, name, region, lat, lng, year, pi, desc.
// The backend returns: id, name, region, latitude, longitude, startDate,
// description, pi: { name, ... }. This maps one to the other in one place,
// so the globe component doesn't need to know about the API's shape at all.
export async function fetchExpeditionsForGlobe() {
  const { data } = await api.get('/expeditions', { params: { limit: 100 } });

  return data.expeditions
    // Pins need real coordinates — silently skip any expedition that was
    // created without lat/lng rather than crashing the globe render.
    .filter((exp) => exp.latitude != null && exp.longitude != null)
    .map((exp) => ({
      id: exp.id,
      name: exp.name,
      region: exp.region || 'Other',
      lat: parseFloat(exp.latitude),
      lng: parseFloat(exp.longitude),
      year: exp.startDate ? new Date(exp.startDate).getFullYear() : null,
      pi: exp.pi?.name || 'Unassigned',
      desc: exp.description || 'No description available yet.',
    }));
}
