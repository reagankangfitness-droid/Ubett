import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { PurchasesPackage } from 'react-native-purchases';
import { colors } from '@/constants/theme';
import { usePro } from '@/contexts/ProContext';

const BENEFITS = [
  { emoji: '\u267E\uFE0F', title: 'Unlimited items', desc: 'Go beyond the 6-item free limit' },
  { emoji: '\uD83D\uDCCD', title: 'Multiple locations', desc: 'Work, gym, school — set custom checklists' },
  { emoji: '\uD83D\uDC65', title: 'Accountability buddy', desc: 'Share your checklist with a partner' },
  { emoji: '\uD83C\uDFE0', title: 'Return home check', desc: 'Remind when you arrive home too' },
  { emoji: '\uD83D\uDCF2', title: 'Home screen widgets', desc: 'Quick-glance checklist on your home screen' },
];

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets();
  const { offerings, purchase, restore, loading } = usePro();
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const monthly = offerings?.current?.monthly ?? null;
  const annual = offerings?.current?.annual ?? null;

  const handlePurchase = async () => {
    const pkg: PurchasesPackage | null = selectedPlan === 'annual' ? annual : monthly;
    if (!pkg) {
      Alert.alert('Not Available', 'Subscriptions are not available right now. Please try again later.');
      return;
    }
    setPurchasing(true);
    try {
      const success = await purchase(pkg);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Welcome to PRO!', 'All features are now unlocked.', [
          { text: 'Awesome!', onPress: () => router.back() },
        ]);
      }
    } catch {
      Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const success = await restore();
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored!', 'Your PRO subscription has been restored.', [
          { text: 'Great!', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No Purchase Found', 'We could not find a previous subscription for this account.');
      }
    } catch {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const monthlyPrice = monthly?.product.priceString ?? '$3.99';
  const annualPrice = annual?.product.priceString ?? '$29.99';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Close button */}
      <Pressable style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>{'\u2715'}</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.headerSection}>
          <Text style={styles.headerEmoji}>{'\uD83D\uDE80'}</Text>
          <Text style={styles.headerTitle}>DoorCheck PRO</Text>
          <Text style={styles.headerSubtitle}>Unlock the full experience</Text>
        </Animated.View>

        {/* Benefits */}
        <View style={styles.benefitsList}>
          {BENEFITS.map((b, i) => (
            <Animated.View
              key={b.title}
              entering={FadeInDown.delay(100 + i * 60).duration(250)}
              style={styles.benefitRow}
            >
              <Text style={styles.benefitEmoji}>{b.emoji}</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Plan picker */}
        <View style={styles.planSection}>
          <Pressable
            style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planTitle, selectedPlan === 'annual' && styles.planTitleSelected]}>
                Annual
              </Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 37%</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, selectedPlan === 'annual' && styles.planPriceSelected]}>
              {annualPrice}/year
            </Text>
            <Text style={styles.planPer}>
              {annual ? `${(annual.product.price / 12).toFixed(2)}/mo` : '$2.50/mo'}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={[styles.planTitle, selectedPlan === 'monthly' && styles.planTitleSelected]}>
              Monthly
            </Text>
            <Text style={[styles.planPrice, selectedPlan === 'monthly' && styles.planPriceSelected]}>
              {monthlyPrice}/month
            </Text>
          </Pressable>
        </View>

        {/* CTA */}
        <Pressable
          style={[styles.ctaBtn, purchasing && { opacity: 0.6 }]}
          onPress={handlePurchase}
          disabled={purchasing || loading}
        >
          <Text style={styles.ctaText}>
            {purchasing ? 'Processing...' : 'Continue'}
          </Text>
        </Pressable>

        {/* Restore */}
        <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={purchasing}>
          <Text style={styles.restoreText}>Restore Purchase</Text>
        </Pressable>

        {/* Legal */}
        <Text style={styles.legalText}>
          Payment will be charged to your Apple ID or Google Play account. Subscription automatically
          renews unless cancelled at least 24 hours before the end of the current period. Manage in
          your device settings.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.inkSoft,
    fontWeight: '600',
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.inkSoft,
    marginTop: 4,
    fontFamily: 'System',
  },

  // Benefits
  benefitsList: {
    gap: 16,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  benefitEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    fontFamily: 'System',
  },
  benefitDesc: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
    fontFamily: 'System',
  },

  // Plan picker
  planSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  planCardSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orange + '08',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.inkSoft,
    fontFamily: 'System',
  },
  planTitleSelected: {
    color: colors.ink,
  },
  saveBadge: {
    backgroundColor: colors.green,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.inkSoft,
    marginTop: 8,
    fontFamily: 'System',
  },
  planPriceSelected: {
    color: colors.orange,
  },
  planPer: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
    fontFamily: 'System',
  },

  // CTA
  ctaBtn: {
    backgroundColor: colors.orange,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
  },

  // Restore
  restoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  restoreText: {
    fontSize: 15,
    color: colors.inkSoft,
    fontWeight: '500',
    fontFamily: 'System',
  },

  // Legal
  legalText: {
    fontSize: 11,
    color: colors.inkSoft + '99',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'System',
  },
});
