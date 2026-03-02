import * as Location from 'expo-location';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface Position {
  latitude: number;
  longitude: number;
}

export interface LocationResult {
  coords: Position;
  timestamp: number;
}

/**
 * Requests foreground location permission from the user.
 * Returns true if permission was granted.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Requests background location permission from the user.
 * Returns true if permission was granted.
 */
export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Gets the user's current position.
 */
export async function getCurrentPosition(): Promise<LocationResult> {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    coords: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    },
    timestamp: location.timestamp,
  };
}

/**
 * Watches the user's position and calls the callback on each update.
 * Returns a subscription object that can be used to stop watching.
 */
export async function watchPosition(
  callback: (location: LocationResult) => void
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      distanceInterval: 10, // Update every 10 meters
      timeInterval: 5000, // Update every 5 seconds
    },
    (location) => {
      callback({
        coords: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        timestamp: location.timestamp,
      });
    }
  );
}

/**
 * Calculates the distance between two points using the Haversine formula.
 * Returns the distance in kilometers.
 */
export function calculateDistance(
  origin: Position,
  destination: Position
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Converts degrees to radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Updates the livreur's current position in Firestore.
 */
export async function updateLivreurPosition(
  livreurId: string,
  position: Position
): Promise<void> {
  const livreurRef = doc(db, 'users', livreurId);
  await updateDoc(livreurRef, {
    position: {
      latitude: position.latitude,
      longitude: position.longitude,
    },
    positionUpdatedAt: serverTimestamp(),
  });
}

/**
 * Geocodes an address string to coordinates.
 * Placeholder: uses Expo's geocoding. For production, integrate Google Geocoding API.
 */
export async function geocodeAddress(
  address: string
): Promise<Position | null> {
  try {
    const results = await Location.geocodeAsync(address);
    if (results.length > 0) {
      return {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Reverse geocodes coordinates to an address string.
 */
export async function reverseGeocodePosition(
  position: Position
): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: position.latitude,
      longitude: position.longitude,
    });
    if (results.length > 0) {
      const result = results[0];
      const parts = [
        result.streetNumber,
        result.street,
        result.postalCode,
        result.city,
      ].filter(Boolean);
      return parts.join(' ');
    }
    return null;
  } catch {
    return null;
  }
}
