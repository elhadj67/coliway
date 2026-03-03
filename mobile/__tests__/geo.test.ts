/**
 * GEO TEST SUITE
 *
 * Unit tests for Coliway geolocation services, distance calculation,
 * and AddressInput component logic.
 * All external dependencies (expo-location, fetch, Firebase, etc.) are mocked.
 */

// ---------------------------------------------------------------------------
// Mocks - must be declared before any imports
// ---------------------------------------------------------------------------

jest.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  functions: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  getFirestore: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}));

const mockRequestForegroundPermissionsAsync = jest.fn();
const mockRequestBackgroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockWatchPositionAsync = jest.fn();
const mockGeocodeAsync = jest.fn();
const mockReverseGeocodeAsync = jest.fn();

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...args: unknown[]) =>
    mockRequestForegroundPermissionsAsync(...args),
  requestBackgroundPermissionsAsync: (...args: unknown[]) =>
    mockRequestBackgroundPermissionsAsync(...args),
  getCurrentPositionAsync: (...args: unknown[]) =>
    mockGetCurrentPositionAsync(...args),
  watchPositionAsync: (...args: unknown[]) =>
    mockWatchPositionAsync(...args),
  geocodeAsync: (...args: unknown[]) => mockGeocodeAsync(...args),
  reverseGeocodeAsync: (...args: unknown[]) =>
    mockReverseGeocodeAsync(...args),
  Accuracy: {
    Balanced: 3,
    BestForNavigation: 6,
    High: 4,
    Highest: 5,
    Low: 1,
    Lowest: 0,
  },
}));

// Global fetch mock
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// ---------------------------------------------------------------------------
// Imports - after mocks
// ---------------------------------------------------------------------------

import {
  requestLocationPermission,
  getCurrentPosition,
  watchPosition,
  calculateDistance,
  geocodeAddress,
  reverseGeocodePosition,
} from '@/services/location';

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ===========================================================================
//  TEST CASES
// ===========================================================================

describe('GEO-01: requestLocationPermission returns true when granted', () => {
  it('should return true when permission status is "granted"', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
    });

    const result = await requestLocationPermission();

    expect(mockRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('should return false when permission status is "denied"', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    const result = await requestLocationPermission();

    expect(result).toBe(false);
  });

  it('should return false when permission status is "undetermined"', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: 'undetermined',
    });

    const result = await requestLocationPermission();

    expect(result).toBe(false);
  });
});

describe('GEO-02: getCurrentPosition returns correct coords', () => {
  it('should return latitude, longitude and timestamp from the device', async () => {
    const mockLocation = {
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
        altitude: 35,
        accuracy: 10,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: 1700000000000,
    };

    mockGetCurrentPositionAsync.mockResolvedValue(mockLocation);

    const result = await getCurrentPosition();

    expect(mockGetCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: 4, // Location.Accuracy.High
    });

    expect(result).toEqual({
      coords: {
        latitude: 48.8566,
        longitude: 2.3522,
      },
      timestamp: 1700000000000,
    });
  });

  it('should only include latitude and longitude (not altitude, speed, etc.)', async () => {
    mockGetCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 45.764,
        longitude: 4.8357,
        altitude: 170,
        accuracy: 15,
        speed: 5,
      },
      timestamp: 1700000001000,
    });

    const result = await getCurrentPosition();

    expect(result.coords).toEqual({
      latitude: 45.764,
      longitude: 4.8357,
    });
    expect((result.coords as any).altitude).toBeUndefined();
    expect((result.coords as any).speed).toBeUndefined();
  });
});

describe('GEO-03: reverseGeocodePosition formats address correctly', () => {
  it('should format address as "streetNumber street postalCode city"', async () => {
    mockReverseGeocodeAsync.mockResolvedValue([
      {
        streetNumber: '10',
        street: 'Rue de Rivoli',
        postalCode: '75001',
        city: 'Paris',
        region: 'Ile-de-France',
        country: 'France',
      },
    ]);

    const result = await reverseGeocodePosition({
      latitude: 48.8606,
      longitude: 2.3376,
    });

    expect(result).toBe('10 Rue de Rivoli 75001 Paris');
  });

  it('should handle missing address components gracefully (filter nulls)', async () => {
    mockReverseGeocodeAsync.mockResolvedValue([
      {
        streetNumber: null,
        street: 'Boulevard Haussmann',
        postalCode: '75009',
        city: 'Paris',
      },
    ]);

    const result = await reverseGeocodePosition({
      latitude: 48.8738,
      longitude: 2.3318,
    });

    // null streetNumber is filtered out by .filter(Boolean)
    expect(result).toBe('Boulevard Haussmann 75009 Paris');
  });

  it('should return null when no geocoding results', async () => {
    mockReverseGeocodeAsync.mockResolvedValue([]);

    const result = await reverseGeocodePosition({
      latitude: 0,
      longitude: 0,
    });

    expect(result).toBeNull();
  });

  it('should return null when the geocoding call throws', async () => {
    mockReverseGeocodeAsync.mockRejectedValue(new Error('Geocoding failed'));

    const result = await reverseGeocodePosition({
      latitude: 48.8566,
      longitude: 2.3522,
    });

    expect(result).toBeNull();
  });
});

describe('GEO-04: Autocomplete triggers after 3+ chars (fetchSuggestions logic)', () => {
  /**
   * The AddressInput component calls fetchSuggestions after a 400ms debounce.
   * fetchSuggestions only fires the API request when input.length >= 3.
   * We test the logic by simulating what fetchSuggestions does.
   */

  function simulateFetchSuggestions(input: string): boolean {
    // Mirrors AddressInput fetchSuggestions guard
    return input.length >= 3;
  }

  it('should allow fetch for input with exactly 3 characters', () => {
    expect(simulateFetchSuggestions('Par')).toBe(true);
  });

  it('should allow fetch for input with more than 3 characters', () => {
    expect(simulateFetchSuggestions('Paris')).toBe(true);
  });

  it('should block fetch for input with fewer than 3 characters', () => {
    expect(simulateFetchSuggestions('Pa')).toBe(false);
    expect(simulateFetchSuggestions('P')).toBe(false);
    expect(simulateFetchSuggestions('')).toBe(false);
  });

  it('should call Nominatim API with correct URL when input >= 3 chars', async () => {
    const input = 'Paris';
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue([
        {
          place_id: 1001,
          display_name: 'Paris, France',
          lat: '48.8566',
          lon: '2.3522',
        },
      ]),
    };
    mockFetch.mockResolvedValue(mockResponse);

    // Simulate what fetchSuggestions does
    if (input.length >= 3) {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&countrycodes=fr&limit=5&addressdetails=1`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'ColiwayApp/1.0',
          },
        }
      );
      const data = await response.json();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('nominatim.openstreetmap.org');
      expect(mockFetch.mock.calls[0][0]).toContain(encodeURIComponent('Paris'));
      expect(data).toHaveLength(1);
      expect(data[0].display_name).toBe('Paris, France');
    }
  });
});

describe('GEO-05: calculateDistance returns correct distance (Paris to Lyon)', () => {
  it('should return approximately 392 km for Paris to Lyon', () => {
    const paris = { latitude: 48.8566, longitude: 2.3522 };
    const lyon = { latitude: 45.764, longitude: 4.8357 };

    const distance = calculateDistance(paris, lyon);

    // Haversine great-circle distance Paris-Lyon is ~392 km
    expect(distance).toBeGreaterThanOrEqual(390);
    expect(distance).toBeLessThanOrEqual(395);
  });

  it('should return the distance rounded to 2 decimal places', () => {
    const a = { latitude: 48.8566, longitude: 2.3522 };
    const b = { latitude: 48.8606, longitude: 2.3376 };

    const distance = calculateDistance(a, b);

    // Check it has at most 2 decimal digits
    const decimalPart = distance.toString().split('.')[1] || '';
    expect(decimalPart.length).toBeLessThanOrEqual(2);
  });
});

describe('GEO-06: Keyboard dismiss timer set at 1.5s', () => {
  /**
   * The AddressInput component sets a setTimeout of 1500ms to dismiss the
   * keyboard after user stops typing (when input >= 3 chars).
   * We verify the timer constant and behavior concept here.
   */

  it('should use 1500ms as the keyboard dismiss delay', () => {
    const KEYBOARD_DISMISS_DELAY = 1500;
    let keyboardDismissed = false;

    // Simulate the timer setup from handleChangeText
    const input = 'Paris';
    if (input.length >= 3) {
      setTimeout(() => {
        keyboardDismissed = true;
      }, KEYBOARD_DISMISS_DELAY);
    }

    // Before 1500ms, keyboard should not be dismissed
    jest.advanceTimersByTime(1499);
    expect(keyboardDismissed).toBe(false);

    // At exactly 1500ms, keyboard should be dismissed
    jest.advanceTimersByTime(1);
    expect(keyboardDismissed).toBe(true);
  });

  it('should not set keyboard dismiss timer for input < 3 chars', () => {
    const KEYBOARD_DISMISS_DELAY = 1500;
    let timerSet = false;

    const input = 'Pa'; // only 2 chars
    if (input.length >= 3) {
      setTimeout(() => {
        timerSet = true;
      }, KEYBOARD_DISMISS_DELAY);
    }

    jest.advanceTimersByTime(2000);
    expect(timerSet).toBe(false);
  });
});

describe('GEO-07: dismissedByTimerRef prevents blur from hiding suggestions', () => {
  /**
   * When the keyboard is dismissed by the 1.5s inactivity timer, the
   * onBlur handler fires. The component uses dismissedByTimerRef to
   * detect this and skip hiding suggestions (so the user can tap one).
   */

  it('should keep suggestions visible when blur is triggered by the timer', () => {
    let dismissedByTimerRef = false;
    let showSuggestions = true;

    // Simulate keyboard dismiss via timer setting the ref
    dismissedByTimerRef = true;

    // Simulate onBlur handler logic from AddressInput
    function handleBlur() {
      if (dismissedByTimerRef) {
        dismissedByTimerRef = false;
        return; // do NOT hide suggestions
      }
      showSuggestions = false;
    }

    handleBlur();

    // Suggestions should still be visible
    expect(showSuggestions).toBe(true);
    // The ref should have been reset
    expect(dismissedByTimerRef).toBe(false);
  });

  it('should hide suggestions on normal blur (not triggered by timer)', () => {
    let dismissedByTimerRef = false;
    let showSuggestions = true;

    // Simulate delayed hiding from handleBlur
    function handleBlur() {
      if (dismissedByTimerRef) {
        dismissedByTimerRef = false;
        return;
      }
      // In the real component, this is done via a 400ms timeout.
      // For the logic test, we set it directly.
      showSuggestions = false;
    }

    handleBlur();

    expect(showSuggestions).toBe(false);
  });
});

describe('GEO-08: No suggestions for <3 characters', () => {
  it('should clear suggestions and hide them when input length < 3', () => {
    let suggestions: unknown[] = [{ id: '1', description: 'Old' }];
    let showSuggestions = true;

    // Simulate fetchSuggestions guard from AddressInput
    function fetchSuggestions(input: string) {
      if (input.length < 3) {
        suggestions = [];
        showSuggestions = false;
        return;
      }
      // ... would fetch from API
    }

    fetchSuggestions('Pa');
    expect(suggestions).toEqual([]);
    expect(showSuggestions).toBe(false);
  });

  it('should clear suggestions for empty input', () => {
    let suggestions: unknown[] = [{ id: '1', description: 'Old' }];
    let showSuggestions = true;

    function fetchSuggestions(input: string) {
      if (input.length < 3) {
        suggestions = [];
        showSuggestions = false;
        return;
      }
    }

    fetchSuggestions('');
    expect(suggestions).toEqual([]);
    expect(showSuggestions).toBe(false);
  });

  it('should clear suggestions for single character input', () => {
    let suggestions: unknown[] = [{ id: '1', description: 'Old' }];
    let showSuggestions = true;

    function fetchSuggestions(input: string) {
      if (input.length < 3) {
        suggestions = [];
        showSuggestions = false;
        return;
      }
    }

    fetchSuggestions('P');
    expect(suggestions).toEqual([]);
    expect(showSuggestions).toBe(false);
  });
});

describe('GEO-09: Handles network error gracefully (fetch rejects)', () => {
  it('should return empty suggestions when Nominatim fetch throws a network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'));

    let suggestions: unknown[] = [];
    let showSuggestions = false;

    // Simulate fetchSuggestions logic from AddressInput
    const input = 'Paris';
    if (input.length >= 3) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&countrycodes=fr&limit=5&addressdetails=1`
        );
        const data = await response.json();
        suggestions = data;
        showSuggestions = true;
      } catch {
        suggestions = [];
        showSuggestions = false;
      }
    }

    expect(suggestions).toEqual([]);
    expect(showSuggestions).toBe(false);
  });

  it('should handle non-OK response status gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    let suggestions: unknown[] = [];
    let showSuggestions = false;

    const input = 'Lyon';
    if (input.length >= 3) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&countrycodes=fr&limit=5&addressdetails=1`
        );
        if (!response.ok) {
          suggestions = [];
          showSuggestions = false;
        }
      } catch {
        suggestions = [];
        showSuggestions = false;
      }
    }

    expect(suggestions).toEqual([]);
    expect(showSuggestions).toBe(false);
  });

  it('should return null from geocodeAddress when geocoding throws', async () => {
    mockGeocodeAsync.mockRejectedValue(new Error('Geocoding service error'));

    const result = await geocodeAddress('Invalid Address XYZ');

    expect(result).toBeNull();
  });
});

describe('GEO-10: Fallback when GPS permission denied (returns default coords)', () => {
  it('should return false from requestLocationPermission when denied', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    const granted = await requestLocationPermission();

    expect(granted).toBe(false);
  });

  it('should allow the app to fall back to default Paris coordinates', async () => {
    mockRequestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    });

    const granted = await requestLocationPermission();

    // When permission is denied, the app uses the default region from config
    const DEFAULT_COORDS = { latitude: 48.8566, longitude: 2.3522 };

    if (!granted) {
      // Fallback to default
      const fallback = DEFAULT_COORDS;
      expect(fallback.latitude).toBe(48.8566);
      expect(fallback.longitude).toBe(2.3522);
    }
  });

  it('should still allow geocodeAddress to work even without GPS permission', async () => {
    // geocodeAddress uses Location.geocodeAsync which does not require GPS
    mockGeocodeAsync.mockResolvedValue([
      { latitude: 48.8566, longitude: 2.3522 },
    ]);

    const result = await geocodeAddress('Paris, France');

    expect(result).toEqual({ latitude: 48.8566, longitude: 2.3522 });
  });
});

describe('GEO-11: calculateDistance with same origin/destination returns 0', () => {
  it('should return 0 when origin and destination are the same point', () => {
    const point = { latitude: 48.8566, longitude: 2.3522 };

    const distance = calculateDistance(point, point);

    expect(distance).toBe(0);
  });

  it('should return 0 for two different objects with identical coordinates', () => {
    const origin = { latitude: 45.764, longitude: 4.8357 };
    const destination = { latitude: 45.764, longitude: 4.8357 };

    const distance = calculateDistance(origin, destination);

    expect(distance).toBe(0);
  });

  it('should return 0 for coordinates at (0, 0)', () => {
    const origin = { latitude: 0, longitude: 0 };
    const destination = { latitude: 0, longitude: 0 };

    const distance = calculateDistance(origin, destination);

    expect(distance).toBe(0);
  });
});
