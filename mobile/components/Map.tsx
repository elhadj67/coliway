import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  Region,
  PROVIDER_GOOGLE,
} from 'react-native-maps';

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
}

interface MapProps {
  markers?: MapMarker[];
  initialRegion?: Region;
  onRegionChange?: (region: Region) => void;
  showUserLocation?: boolean;
  routeCoordinates?: Coordinate[];
  style?: ViewStyle;
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
}) => {
  return (
    <MapView
      style={[styles.map, style]}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation={showUserLocation}
      showsMyLocationButton={showUserLocation}
      showsCompass
      showsScale
    >
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={marker.coordinate}
          title={marker.title}
          description={marker.description}
          pinColor={marker.color || COLORS.primary}
        />
      ))}
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
});

export default Map;
export type { MapProps, MapMarker, Coordinate, Region };
