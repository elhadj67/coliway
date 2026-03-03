import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants/theme';

export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="chatbubbles-outline"
          size={80}
          color={Colors.border}
        />
        <Text style={styles.title}>Vos messages</Text>
        <Text style={styles.subtitle}>
          Vos conversations avec les livreurs apparaitront ici une fois que vous aurez passe une commande.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
    maxWidth: 280,
  },
});
