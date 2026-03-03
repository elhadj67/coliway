import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Image, View } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

function HeaderLogo() {
  return (
    <View style={styles.headerLogoContainer}>
      <Image
        source={require('../../assets/logo.png')}
        style={styles.headerLogo}
        resizeMode="contain"
      />
    </View>
  );
}

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerTintColor: Colors.primary,
        headerTitle: () => <HeaderLogo />,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Commandes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="suivi" options={{ href: null }} />
      <Tabs.Screen name="profil" options={{ href: null }} />
      <Tabs.Screen name="paiement" options={{ href: null }} />
      <Tabs.Screen name="historique" options={{ href: null }} />
      <Tabs.Screen name="nouvelle-commande" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.white,
    elevation: 2,
    shadowOpacity: 0.08,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 120,
    height: 36,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    height: Platform.OS === 'ios' ? 88 : 64,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 4,
  },
});
