import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  accent: '#F39C12',
  success: '#27AE60',
  danger: '#E74C3C',
  warning: '#F39C12',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
};

type ColisType = 'enveloppe' | 'petit' | 'moyen' | 'gros' | 'palette';

interface ColisTypeOption {
  type: ColisType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  poidsMax: string;
}

const COLIS_TYPES: ColisTypeOption[] = [
  {
    type: 'enveloppe',
    label: 'Enveloppe',
    icon: 'mail',
    poidsMax: '0.5 kg',
  },
  {
    type: 'petit',
    label: 'Petit',
    icon: 'cube-outline',
    poidsMax: '2 kg',
  },
  {
    type: 'moyen',
    label: 'Moyen',
    icon: 'cube',
    poidsMax: '10 kg',
  },
  {
    type: 'gros',
    label: 'Gros',
    icon: 'archive',
    poidsMax: '30 kg',
  },
  {
    type: 'palette',
    label: 'Palette',
    icon: 'grid',
    poidsMax: '100 kg',
  },
];

interface ColisTypeSelectorProps {
  selectedType: ColisType | null;
  onSelect: (type: ColisType) => void;
}

const ColisTypeSelector: React.FC<ColisTypeSelectorProps> = ({
  selectedType,
  onSelect,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {COLIS_TYPES.map((item) => {
        const isSelected = selectedType === item.type;
        return (
          <TouchableOpacity
            key={item.type}
            style={[
              styles.typeCard,
              isSelected && styles.typeCardSelected,
            ]}
            onPress={() => onSelect(item.type)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={28}
                color={isSelected ? COLORS.primary : COLORS.textLight}
              />
            </View>
            <Text
              style={[
                styles.typeLabel,
                isSelected && styles.typeLabelSelected,
              ]}
            >
              {item.label}
            </Text>
            <Text style={styles.poidsMax}>{item.poidsMax}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  typeCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 12,
    minWidth: 95,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EDF2F9',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconContainerSelected: {
    backgroundColor: '#D6E4F5',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  typeLabelSelected: {
    color: COLORS.primary,
  },
  poidsMax: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '400',
  },
});

export default ColisTypeSelector;
