import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  textLight: '#7F8C8D',
  text: '#2C3E50',
  border: '#E0E6ED',
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

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface MapProps {
  markers?: MapMarker[];
  initialRegion?: Region;
  onRegionChange?: (region: Region) => void;
  showUserLocation?: boolean;
  routeCoordinates?: Coordinate[];
  style?: ViewStyle;
}

const Map: React.FC<MapProps> = ({ markers = [], style }) => {
  return (
    <View style={[styles.map, style]}>
      <View style={styles.content}>
        <Text style={styles.icon}>🗺️</Text>
        <Text style={styles.title}>Carte Coliway</Text>
        <Text style={styles.subtitle}>
          La carte interactive est disponible sur l'app mobile
        </Text>
        {markers.length > 0 && (
          <View style={styles.markersList}>
            {markers.map((marker) => (
              <View key={marker.id} style={styles.markerItem}>
                <View
                  style={[
                    styles.markerDot,
                    { backgroundColor: marker.color || COLORS.primary },
                  ]}
                />
                <Text style={styles.markerText}>
                  {marker.title || `${marker.coordinate.latitude.toFixed(4)}, ${marker.coordinate.longitude.toFixed(4)}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  markersList: {
    marginTop: 16,
    width: '100%',
  },
  markerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  markerText: {
    fontSize: 12,
    color: COLORS.text,
  },
});

export default Map;
export type { MapProps, MapMarker, Coordinate, Region };
