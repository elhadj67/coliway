import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  Region,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
};

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface MapMarker {
  id: string;
  coordinate: Coordinate;
  title?: string;
  description?: string;
  color?: string;
  icon?: string;
}

interface MapProps {
  markers?: MapMarker[];
  initialRegion?: Region;
  onRegionChange?: (region: Region) => void;
  showUserLocation?: boolean;
  routeCoordinates?: Coordinate[];
  style?: ViewStyle;
  followCoordinate?: Coordinate | null;
}

const DEFAULT_REGION: Region = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 8.0,
  longitudeDelta: 8.0,
};

const Map: React.FC<MapProps> = ({
  markers = [],
  initialRegion = DEFAULT_REGION,
  onRegionChange,
  showUserLocation = false,
  routeCoordinates,
  style,
  followCoordinate,
}) => {
  const mapRef = useRef<MapView>(null);

  // Animate to followed coordinate when it changes
  useEffect(() => {
    if (followCoordinate && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: followCoordinate.latitude,
          longitude: followCoordinate.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        800
      );
    }
  }, [followCoordinate?.latitude, followCoordinate?.longitude]);

  return (
    <MapView
      ref={mapRef}
      style={[styles.map, style]}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      initialRegion={initialRegion}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation={showUserLocation}
      showsMyLocationButton={showUserLocation}
      showsCompass
      showsScale
    >
      {markers.map((marker) =>
        marker.icon ? (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
          >
            <View style={styles.customMarker}>
              <Ionicons
                name={marker.icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color="#fff"
              />
            </View>
          </Marker>
        ) : (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            pinColor={marker.color || COLORS.primary}
          />
        )
      )}
      {routeCoordinates && routeCoordinates.length > 1 && (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor={COLORS.secondary}
          strokeWidth={4}
        />
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  customMarker: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default Map;
export type { MapProps, MapMarker, Coordinate, Region };
