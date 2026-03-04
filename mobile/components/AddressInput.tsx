import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
};

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface Suggestion {
  id: string;
  description: string;
  lat: number;
  lng: number;
}

interface AddressInputProps {
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  style?: ViewStyle;
}

const AddressInput: React.FC<AddressInputProps> = ({
  placeholder,
  icon,
  value,
  onAddressSelect,
  style,
}) => {
  const [text, setText] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissedByTimerRef = useRef(false);

  React.useEffect(() => {
    if (value !== undefined) {
      setText(value);
    }
  }, [value]);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      // Use Nominatim (OpenStreetMap) - reliable and free
      const osmResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&countrycodes=fr&limit=5&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ColiwayApp/1.0',
          },
        }
      );

      if (!osmResponse.ok) {
        console.warn('Nominatim response not OK:', osmResponse.status);
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      const osmData: NominatimResult[] = await osmResponse.json();
      console.log('Nominatim results for "' + input + '":', osmData.length);

      if (osmData.length > 0) {
        const newSuggestions = osmData.map((item) => ({
          id: item.place_id.toString(),
          description: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }));
        setSuggestions(newSuggestions);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.warn('Fetch suggestions error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (input: string) => {
    setText(input);
    // Cancel any pending timers
    if (blurRef.current) { clearTimeout(blurRef.current); blurRef.current = null; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (keyboardDismissRef.current) { clearTimeout(keyboardDismissRef.current); keyboardDismissRef.current = null; }

    // Fetch suggestions after 400ms
    debounceRef.current = setTimeout(() => fetchSuggestions(input), 400);

    // Dismiss keyboard after 1.5s of inactivity so user can see suggestions
    if (input.length >= 3) {
      keyboardDismissRef.current = setTimeout(() => {
        dismissedByTimerRef.current = true;
        Keyboard.dismiss();
      }, 1500);
    }
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    // Cancel any pending blur hide
    if (blurRef.current) {
      clearTimeout(blurRef.current);
      blurRef.current = null;
    }
    setText(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    // Coordinates are already stored from the Nominatim search
    onAddressSelect(suggestion.description, suggestion.lat, suggestion.lng);
  };


  const handleBlur = () => {
    setIsFocused(false);
    // If keyboard was dismissed by our timer, keep suggestions visible
    if (dismissedByTimerRef.current) {
      dismissedByTimerRef.current = false;
      return;
    }
    // Delay hiding so the user can tap a suggestion
    blurRef.current = setTimeout(() => {
      setShowSuggestions(false);
    }, 400);
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.inputWrapper,
          { borderColor: isFocused ? COLORS.primary : COLORS.border, borderWidth: isFocused ? 2 : 1 },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={isFocused ? COLORS.primary : COLORS.textLight}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={handleBlur}
        />
        {loading && <ActivityIndicator size="small" color={COLORS.secondary} style={styles.loader} />}
      </View>

      {/* Suggestions rendered INLINE (not absolute) to avoid Android clipping */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={styles.suggestionsList}
          >
            {suggestions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.suggestionRow}
                onPress={() => handleSelectSuggestion(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 14,
  },
  loader: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginTop: 4,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
});

export default AddressInput;
