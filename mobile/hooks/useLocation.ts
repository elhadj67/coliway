import { useState, useEffect, useRef } from 'react';
import * as ExpoLocation from 'expo-location';
import {
  requestLocationPermission,
  watchPosition,
  Position,
  LocationResult,
} from '@/services/location';

interface UseLocationReturn {
  location: Position | null;
  errorMsg: string | null;
  loading: boolean;
}

/**
 * Hook that requests location permission on mount and watches position updates.
 * Returns the current location, any error message, and loading state.
 */
export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<Position | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const subscriptionRef = useRef<ExpoLocation.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function startWatching() {
      try {
        const granted = await requestLocationPermission();

        if (!granted) {
          if (isMounted) {
            setErrorMsg(
              "L'acc\u00e8s \u00e0 la localisation a \u00e9t\u00e9 refus\u00e9. Veuillez l'activer dans les param\u00e8tres."
            );
            setLoading(false);
          }
          return;
        }

        const subscription = await watchPosition(
          (locationResult: LocationResult) => {
            if (isMounted) {
              setLocation(locationResult.coords);
              setLoading(false);
            }
          }
        );

        subscriptionRef.current = subscription;
      } catch (error: unknown) {
        if (isMounted) {
          const message =
            error instanceof Error
              ? error.message
              : 'Erreur lors de la r\u00e9cup\u00e9ration de la position';
          setErrorMsg(message);
          setLoading(false);
        }
      }
    }

    startWatching();

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  return { location, errorMsg, loading };
}
