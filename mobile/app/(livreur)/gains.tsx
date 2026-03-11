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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { getLivreurOrders, Order } from '@/services/orders';
import { calculateDistance } from '@/services/location';
import { Colors } from '@/constants/theme';
import { Timestamp } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import {
  fetchCommissionRate,
  COMMISSION_RATE as DEFAULT_COMMISSION_RATE,
  createConnectAccount,
  getConnectAccountStatus,
  requestPayout,
  getPayoutHistory,
  ConnectAccountStatus,
  PayoutRecord,
} from '@/services/gains';

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

function getEarnings(order: Order, commissionRate: number): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * (1 - commissionRate);
}

function getCommission(order: Order, commissionRate: number): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * commissionRate;
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

function getDailyEarnings(orders: Order[], commissionRate: number): DayEarnings[] {
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
    map.set(key, prev + getEarnings(order, commissionRate));
  });

  return Array.from(map.entries())
    .map(([day, amount]) => ({ day, amount }))
    .slice(-7); // Last 7 days with data
}

export default function GainsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('today');
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(DEFAULT_COMMISSION_RATE);

  // Payout state
  const [connectStatus, setConnectStatus] = useState<ConnectAccountStatus | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([]);
  const [loadingConnect, setLoadingConnect] = useState(true);
  const [processingPayout, setProcessingPayout] = useState(false);

  useEffect(() => {
    fetchCommissionRate().then(setCommissionRate);
    loadConnectStatus();
    loadPayoutHistory();
  }, []);

  const loadConnectStatus = async () => {
    setLoadingConnect(true);
    try {
      const status = await getConnectAccountStatus();
      setConnectStatus(status);
    } catch {
      setConnectStatus({ status: 'not_created' });
    } finally {
      setLoadingConnect(false);
    }
  };

  const loadPayoutHistory = async () => {
    try {
      const history = await getPayoutHistory();
      setPayoutHistory(history);
    } catch {
      // ignore
    }
  };

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

  const totalEarnings = periodOrders.reduce((sum, o) => sum + getEarnings(o, commissionRate), 0);
  const totalCourses = periodOrders.length;
  const averageEarning = totalCourses > 0 ? totalEarnings / totalCourses : 0;
  const totalDistance = periodOrders.reduce(
    (sum, o) => sum + getOrderDistance(o),
    0
  );

  const dailyEarnings = getDailyEarnings(periodOrders, commissionRate);
  const maxDailyAmount = Math.max(...dailyEarnings.map((d) => d.amount), 1);

  const handleSetupConnect = async () => {
    try {
      const { onboardingUrl } = await createConnectAccount();
      await WebBrowser.openBrowserAsync(onboardingUrl);
      // Refresh status after returning from onboarding
      await loadConnectStatus();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la configuration.';
      Alert.alert('Erreur', msg);
    }
  };

  const handleRequestPayout = () => {
    if (!connectStatus || connectStatus.status !== 'active') {
      if (connectStatus?.status === 'not_created' || connectStatus?.status === 'onboarding_incomplete') {
        Alert.alert(
          'Compte bancaire requis',
          'Configurez votre compte bancaire pour recevoir vos versements.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Configurer', onPress: handleSetupConnect },
          ]
        );
      } else {
        Alert.alert(
          'Verification en cours',
          'Votre compte bancaire est en cours de verification par Stripe. Reessayez dans quelques minutes.'
        );
      }
      return;
    }

    Alert.alert(
      'Demande de versement',
      `Voulez-vous demander le versement de vos gains disponibles ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setProcessingPayout(true);
            try {
              const result = await requestPayout();
              Alert.alert(
                'Versement effectue',
                `${result.amount.toFixed(2)} EUR pour ${result.orderCount} course(s) ont ete verses sur votre compte.`
              );
              await loadPayoutHistory();
            } catch (error: any) {
              const msg = error?.message || 'Erreur lors du versement.';
              Alert.alert('Erreur', msg);
            } finally {
              setProcessingPayout(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des gains...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
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
            Commission Coliway : {(commissionRate * 100).toFixed(0)}%
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="bicycle-outline" size={20} color={Colors.secondary} />
            <Text style={styles.statValue}>{totalCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={20} color={Colors.accent} />
            <Text style={styles.statValue}>{averageEarning.toFixed(2)} EUR</Text>
            <Text style={styles.statLabel}>Gain moyen</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="speedometer-outline" size={20} color={Colors.primary} />
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
                                ? Colors.secondary
                                : Colors.secondary + '60',
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
                color={Colors.textLight}
              />
              <Text style={styles.emptyText}>
                Aucune transaction pour cette periode
              </Text>
            </View>
          ) : (
            periodOrders.slice(0, 10).map((order) => {
              const earnings = getEarnings(order, commissionRate);
              const commission = getCommission(order, commissionRate);
              return (
                <View key={order.id} style={styles.transactionRow}>
                  <View style={styles.transactionLeft}>
                    <View style={styles.transactionIcon}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.success}
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

        {/* Connect Status Banner */}
        {!loadingConnect && connectStatus && connectStatus.status !== 'active' && (
          <View style={styles.connectBanner}>
            <Ionicons
              name={connectStatus.status === 'pending_verification' ? 'time-outline' : 'alert-circle-outline'}
              size={20}
              color={connectStatus.status === 'pending_verification' ? Colors.accent : Colors.danger}
            />
            <View style={styles.connectBannerContent}>
              <Text style={styles.connectBannerTitle}>
                {connectStatus.status === 'not_created'
                  ? 'Compte bancaire non configure'
                  : connectStatus.status === 'onboarding_incomplete'
                  ? 'Inscription incomplete'
                  : 'Verification en cours'}
              </Text>
              <Text style={styles.connectBannerText}>
                {connectStatus.status === 'pending_verification'
                  ? 'Stripe verifie vos informations. Cela peut prendre quelques minutes.'
                  : 'Configurez votre compte pour recevoir vos gains.'}
              </Text>
            </View>
            {connectStatus.status !== 'pending_verification' && (
              <TouchableOpacity onPress={handleSetupConnect} activeOpacity={0.7}>
                <Ionicons name="arrow-forward-circle" size={28} color={Colors.secondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Payout Button */}
        <TouchableOpacity
          style={[styles.payoutButton, processingPayout && styles.payoutButtonDisabled]}
          onPress={handleRequestPayout}
          disabled={processingPayout}
          activeOpacity={0.7}
        >
          {processingPayout ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Ionicons name="wallet-outline" size={20} color={Colors.white} />
          )}
          <Text style={styles.payoutButtonText}>
            {processingPayout ? 'Versement en cours...' : 'Demander un versement'}
          </Text>
        </TouchableOpacity>

        {/* Payout History */}
        {payoutHistory.length > 0 && (
          <View style={styles.payoutHistorySection}>
            <Text style={styles.sectionTitle}>Historique des versements</Text>
            {payoutHistory.map((payout) => (
              <View key={payout.id} style={styles.payoutRow}>
                <View style={styles.payoutRowLeft}>
                  <View style={styles.payoutIcon}>
                    <Ionicons name="arrow-down-circle" size={18} color={Colors.secondary} />
                  </View>
                  <View>
                    <Text style={styles.payoutRowTitle}>
                      {payout.nombreCourses} course{payout.nombreCourses > 1 ? 's' : ''}
                    </Text>
                    <Text style={styles.payoutRowDate}>
                      {payout.createdAt
                        ? new Date(payout.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '--'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.payoutRowAmount}>
                  {payout.montant.toFixed(2)} EUR
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // Screen Header
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  periodTabTextActive: {
    color: Colors.white,
  },

  // Earnings Card
  earningsCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: Colors.primary,
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
    color: Colors.white,
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
    backgroundColor: Colors.white,
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
    color: Colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Chart
  chartCard: {
    backgroundColor: Colors.white,
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
    color: Colors.text,
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
    color: Colors.textLight,
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
    color: Colors.textLight,
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
    color: Colors.text,
    marginBottom: 12,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
  },
  transactionCommission: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Connect Banner
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  connectBannerContent: {
    flex: 1,
  },
  connectBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  connectBannerText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Payout Button
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  payoutButtonDisabled: {
    opacity: 0.6,
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },

  // Payout History
  payoutHistorySection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  payoutRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  payoutRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  payoutRowDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  payoutRowAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.secondary,
  },
});
