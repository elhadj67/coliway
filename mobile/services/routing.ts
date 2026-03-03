import { Position } from './location';

const GOOGLE_API_KEY = 'AIzaSyBmB58zih7ICTRrycl1bVfB_OybotqKxW4';

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;         // temps sans trafic
  durationTrafficMin: number;  // temps avec trafic temps réel
  trafficLevel: 'fluide' | 'modéré' | 'dense' | 'inconnu';
}

/**
 * Get route data: tries Google Distance Matrix (real-time traffic),
 * then falls back to OSRM (free, no traffic).
 */
export async function getRouteInfo(
  origin: Position,
  destination: Position
): Promise<RouteInfo> {
  try {
    return await googleDistanceMatrix(origin, destination);
  } catch (error) {
    console.warn('Google Distance Matrix failed, falling back to OSRM:', error);
    try {
      return await osrmRoute(origin, destination);
    } catch (osrmError) {
      console.warn('OSRM also failed:', osrmError);
      throw new Error('Impossible de calculer le trajet');
    }
  }
}

/**
 * Google Distance Matrix API - includes real-time traffic
 */
async function googleDistanceMatrix(
  origin: Position,
  destination: Position
): Promise<RouteInfo> {
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json` +
    `?origins=${origin.latitude},${origin.longitude}` +
    `&destinations=${destination.latitude},${destination.longitude}` +
    `&key=${GOOGLE_API_KEY}` +
    `&mode=driving` +
    `&departure_time=now` +
    `&language=fr`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(`Google API status: ${data.status}`);
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`Element status: ${element?.status || 'missing'}`);
  }

  const distanceKm = element.distance.value / 1000;
  const durationSec = element.duration.value;
  const durationTrafficSec = element.duration_in_traffic?.value || durationSec;

  const durationMin = Math.round(durationSec / 60);
  const durationTrafficMin = Math.round(durationTrafficSec / 60);

  // Determine traffic level from ratio
  const ratio = durationTrafficSec / durationSec;
  let trafficLevel: RouteInfo['trafficLevel'];
  if (ratio < 1.15) {
    trafficLevel = 'fluide';
  } else if (ratio < 1.4) {
    trafficLevel = 'modéré';
  } else {
    trafficLevel = 'dense';
  }

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMin,
    durationTrafficMin,
    trafficLevel,
  };
}

/**
 * OSRM (OpenStreetMap) - free fallback, no traffic data
 * Note: OSRM uses longitude,latitude (reversed from Google)
 */
async function osrmRoute(
  origin: Position,
  destination: Position
): Promise<RouteInfo> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    `?overview=false`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`OSRM error: ${data.code}`);
  }

  const route = data.routes[0];
  const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
  const durationMin = Math.round(route.duration / 60);

  return {
    distanceKm,
    durationMin,
    durationTrafficMin: durationMin, // OSRM has no traffic
    trafficLevel: 'inconnu',
  };
}
