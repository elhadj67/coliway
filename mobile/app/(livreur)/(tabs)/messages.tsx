import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getLivreurOrders, Order } from '@/services/orders';
import { subscribeToMessages, ChatMessage } from '@/services/chat';
import { getUserProfile, UserProfile } from '@/services/auth';

export default function LivreurMessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage | null>>({});
  const [clientProfiles, setClientProfiles] = useState<Record<string, UserProfile | null>>({});
  const [loading, setLoading] = useState(true);

  // Subscribe to livreur orders and filter active ones
  useEffect(() => {
    if (!user) return;

    const unsubscribe = getLivreurOrders(user.uid, (orders) => {
      const active = orders.filter(
        (o) =>
          o.status === 'acceptee' ||
          o.status === 'en_transit' ||
          o.status === 'enlevee'
      );
      setActiveOrders(active);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to messages for each active order
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    activeOrders.forEach((order) => {
      const unsub = subscribeToMessages(order.id, (messages) => {
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        setLastMessages((prev) => ({ ...prev, [order.id]: lastMsg }));
      });
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [activeOrders]);

  // Fetch client profiles for active orders
  useEffect(() => {
    activeOrders.forEach((order) => {
      if (!clientProfiles[order.clientId]) {
        getUserProfile(order.clientId).then((profile) => {
          setClientProfiles((prev) => ({ ...prev, [order.clientId]: profile }));
        });
      }
    });
  }, [activeOrders]);

  const handleOpenChat = (orderId: string) => {
    router.push({
      pathname: '/(livreur)/chat',
      params: { orderId },
    });
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (activeOrders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color={Colors.border} />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptySubtitle}>
            Vos conversations avec les clients apparaitront ici lorsque vous aurez une course en cours.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activeOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const clientProfile = clientProfiles[item.clientId];
          const lastMsg = lastMessages[item.id];
          const clientName = clientProfile
            ? `${clientProfile.prenom} ${clientProfile.nom}`
            : 'Client';
          const initials = clientProfile
            ? (clientProfile.prenom?.[0] || '').toUpperCase() +
              (clientProfile.nom?.[0] || '').toUpperCase()
            : '?';

          return (
            <TouchableOpacity
              style={styles.conversationCard}
              onPress={() => handleOpenChat(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
              <View style={styles.conversationContent}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.conversationName} numberOfLines={1}>
                    {clientName}
                  </Text>
                  {lastMsg && (
                    <Text style={styles.conversationTime}>
                      {formatTime(lastMsg.createdAt)}
                    </Text>
                  )}
                </View>
                <Text style={styles.conversationPreview} numberOfLines={1}>
                  {lastMsg ? lastMsg.text : 'Aucun message'}
                </Text>
                <Text style={styles.conversationOrder} numberOfLines={1}>
                  Commande #{item.id.slice(0, 8)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.base,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
    maxWidth: 280,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarInitials: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    flex: 1,
  },
  conversationTime: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginLeft: Spacing.sm,
  },
  conversationPreview: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: 2,
  },
  conversationOrder: {
    fontSize: Typography.sizes.xs,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
});
