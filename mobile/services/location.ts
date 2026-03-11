import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
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

// ============================================================
// Background location tracking for livreurs
// ============================================================

const BACKGROUND_LOCATION_TASK = 'coliway-background-location';

// Store the livreur ID for the background task
let _backgroundLivreurId: string | null = null;

// Define the background task at module level (required by expo-task-manager)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data && _backgroundLivreurId) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latest = locations[locations.length - 1];
    if (latest) {
      try {
        await updateLivreurPosition(_backgroundLivreurId, {
          latitude: latest.coords.latitude,
          longitude: latest.coords.longitude,
        });
      } catch (err) {
        console.error('Background position update failed:', err);
      }
    }
  }
});

/**
 * Starts background location tracking for a livreur.
 * Updates position in Firestore even when the app is in the background.
 */
export async function startBackgroundLocationTracking(
  livreurId: string
): Promise<boolean> {
  const bgGranted = await requestBackgroundLocationPermission();
  if (!bgGranted) return false;

  _backgroundLivreurId = livreurId;

  const isTracking = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  ).catch(() => false);

  if (!isTracking) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 20,
      timeInterval: 10000,
      foregroundService: {
        notificationTitle: 'Coliway - Course en cours',
        notificationBody: 'Votre position est partagée avec le client.',
        notificationColor: '#1B3A5C',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
  }

  return true;
}

/**
 * Stops background location tracking.
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  _backgroundLivreurId = null;

  const isTracking = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK
  ).catch(() => false);

  if (isTracking) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
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
