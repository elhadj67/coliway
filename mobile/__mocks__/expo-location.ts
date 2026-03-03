const ExpoLocation = {
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  requestBackgroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 48.8566, longitude: 2.3522 },
      timestamp: Date.now(),
    })
  ),
  watchPositionAsync: jest.fn(() =>
    Promise.resolve({ remove: jest.fn() })
  ),
  geocodeAsync: jest.fn(() =>
    Promise.resolve([{ latitude: 48.8566, longitude: 2.3522 }])
  ),
  reverseGeocodeAsync: jest.fn(() =>
    Promise.resolve([{
      streetNumber: '1',
      street: 'Rue de Rivoli',
      postalCode: '75001',
      city: 'Paris',
    }])
  ),
  Accuracy: {
    Balanced: 3,
    High: 4,
    Highest: 5,
    Low: 2,
    Lowest: 1,
  },
};

export default ExpoLocation;
module.exports = ExpoLocation;
