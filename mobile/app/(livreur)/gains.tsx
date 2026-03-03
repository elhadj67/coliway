import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { getLivreurOrders, Order } from '@/services/orders';
import { calculateDistance } from '@/services/location';
import { Timestamp } from 'firebase/firestore';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  accent: '#F39C12',
  success: '#27AE60',
  danger: '#E74C3C',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
};

const COMMISSION_RATE = 0.20;

type PeriodKey = 'today' | 'week' | 'month' | 'total';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'total', label: 'Total' },
];

function getStartOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function orderInPeriod(order: Order, period: PeriodKey): boolean {
  if (period === 'total') return true;

  const orderDate = order.deliveredAt
    ? order.deliveredAt.toDate()
    : order.createdAt
    ? order.createdAt.toDate()
    : null;

  if (!orderDate) return false;

  let startDate: Date;
  switch (period) {
    case 'today':
      startDate = getStartOfDay();
      break;
    case 'week':
      startDate = getStartOfWeek();
      break;
    case 'month':
      startDate = getStartOfMonth();
      break;
    default:
      return true;
  }

  return orderDate >= startDate;
}

function getEarnings(order: Order): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * (1 - COMMISSION_RATE);
}

function getCommission(order: Order): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * COMMISSION_RATE;
}

function getOrderDistance(order: Order): number {
  return calculateDistance(
    {
      latitude: order.adresseEnlevement.latitude,
      longitude: order.adresseEnlevement.longitude,
    },
    {
      latitude: order.adresseLivraison.latitude,
      longitude: order.adresseLivraison.longitude,
    }
  );
}

function formatDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '--';
  try {
    return timestamp.toDate().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '--';
  }
}

interface DayEarnings {
  day: string;
  amount: number;
}

function getDailyEarnings(orders: Order[]): DayEarnings[] {
  const map = new Map<string, number>();

  orders.forEach((order) => {
    const dateObj = order.deliveredAt
      ? order.deliveredAt.toDate()
      : order.createdAt?.toDate();
    if (!dateObj) return;

    const key = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
    const prev = map.get(key) || 0;
    map.set(key, prev + getEarnings(order));
  });

  return Array.from(map.entries())
    .map(([day, amount]) => ({ day, amount }))
    .slice(-7); // Last 7 days with data
}

export default function GainsScreen() {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = getLivreurOrders(user.uid, (orders) => {
      const deliveredOrders = orders.filter((o) => o.status === 'livree');
      setAllOrders(deliveredOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const periodOrders = allOrders.filter((o) => orderInPeriod(o, selectedPeriod));

  const totalEarnings = periodOrders.reduce((sum, o) => sum + getEarnings(o), 0);
  const totalCourses = periodOrders.length;
  const averageEarning = totalCourses > 0 ? totalEarnings / totalCourses : 0;
  const totalDistance = periodOrders.reduce(
    (sum, o) => sum + getOrderDistance(o),
    0
  );

  const dailyEarnings = getDailyEarnings(periodOrders);
  const maxDailyAmount = Math.max(...dailyEarnings.map((d) => d.amount), 1);

  const handleRequestPayout = () => {
    Alert.alert(
      'Demande de versement',
      'Cette fonctionnalite sera bientot disponible. Vos gains seront verses automatiquement selon le calendrier de paiement.',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des gains...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Mes gains</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodContainer}
        >
          {PERIODS.map((period) => {
            const isActive = selectedPeriod === period.key;
            return (
              <TouchableOpacity
                key={period.key}
                style={[styles.periodTab, isActive && styles.periodTabActive]}
                onPress={() => setSelectedPeriod(period.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    isActive && styles.periodTabTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Big Earnings Display */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Gains nets</Text>
          <Text style={styles.earningsAmount}>
            {totalEarnings.toFixed(2)} EUR
          </Text>
          <Text style={styles.commissionInfo}>
            Commission Coliway : {(COMMISSION_RATE * 100).toFixed(0)}%
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="bicycle-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.statValue}>{totalCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={COLORS.accent} />
            <Text style={styles.statValue}>{averageEarning.toFixed(2)} EUR</Text>
            <Text style={styles.statLabel}>Gain moyen</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={20} color={COLORS.primary} />
            <Text style={styles.statValue}>{totalDistance.toFixed(1)} km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>

        {/* Earnings Chart (Simple Bar Chart) */}
        {dailyEarnings.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Gains par jour</Text>
            <View style={styles.chartContainer}>
              {dailyEarnings.map((item, index) => {
                const barHeight = (item.amount / maxDailyAmount) * 120;
                return (
                  <View key={index} style={styles.barColumn}>
                    <Text style={styles.barAmount}>
                      {item.amount.toFixed(0)}
                    </Text>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(barHeight, 4),
                            backgroundColor:
                              index === dailyEarnings.length - 1
                                ? COLORS.secondary
                                : COLORS.secondary + '60',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>Transactions recentes</Text>
          {periodOrders.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons
                name="receipt-outline"
                size={36}
                color={COLORS.textLight}
              />
              <Text style={styles.emptyText}>
                Aucune transaction pour cette periode
              </Text>
            </View>
          ) : (
            periodOrders.slice(0, 10).map((order) => {
              const earnings = getEarnings(order);
              const commission = getCommission(order);
              return (
                <View key={order.id} style={styles.transactionRow}>
                  <View style={styles.transactionLeft}>
                    <View style={styles.transactionIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={COLORS.success}
                      />
                    </View>
                    <View>
                      <Text style={styles.transactionTitle}>
                        Course #{order.id.slice(0, 8)}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {formatDate(order.deliveredAt || order.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={styles.transactionAmount}>
                      +{earnings.toFixed(2)} EUR
                    </Text>
                    <Text style={styles.transactionCommission}>
                      -{commission.toFixed(2)} EUR comm.
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Payout Button */}
        <TouchableOpacity
          style={styles.payoutButton}
          onPress={handleRequestPayout}
          activeOpacity={0.7}
        >
          <Ionicons name="wallet-outline" size={20} color={COLORS.white} />
          <Text style={styles.payoutButtonText}>Demander un versement</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Screen Header
  screenHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Period Selector
  periodContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  periodTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  periodTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  periodTabTextActive: {
    color: COLORS.white,
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.white,
  },
  commissionInfo: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Chart
  chartCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barAmount: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 120,
  },
  bar: {
    width: '60%',
    maxWidth: 32,
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center',
  },

  // Transactions
  transactionsSection: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.success,
  },
  transactionCommission: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Payout Button
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
