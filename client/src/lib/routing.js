const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchRoutePath(from, to) {
  try {
    const url = `${OSRM_ROUTE_URL}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const coordinates = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

    return coordinates.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}
