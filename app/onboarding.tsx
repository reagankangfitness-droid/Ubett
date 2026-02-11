import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { colors } from '@/constants/theme';
import { requestNotificationPermissions } from '@/lib/notifications';
import { loadTriggerSettings, saveTriggerSettings } from '@/lib/triggerSettings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_KEY = 'ubett_onboarding_complete';
const ITEMS_KEY = 'ubett_items';
const TOTAL_PAGES = 4;

// ── Item data ──────────────────────────────────────────────

interface EssentialItem {
  emoji: string;
  label: string;
}

const DEFAULT_ESSENTIALS: EssentialItem[] = [
  { emoji: '\uD83D\uDCF1', label: 'Phone' },
  { emoji: '\uD83D\uDC5B', label: 'Wallet' },
  { emoji: '\uD83D\uDD11', label: 'Keys' },
  { emoji: '\uD83D\uDC8A', label: 'Meds' },
  { emoji: '\uD83E\uDD57', label: 'Lunch' },
];

const OPTIONAL_ESSENTIALS: EssentialItem[] = [
  { emoji: '\uD83D\uDCBB', label: 'Laptop' },
  { emoji: '\uD83C\uDF92', label: 'Bag' },
  { emoji: '\uD83E\uDDF4', label: 'Sunscreen' },
  { emoji: '\u2602\uFE0F', label: 'Umbrella' },
  { emoji: '\uD83D\uDCC4', label: 'Documents' },
];

// ── Animated sub-components ────────────────────────────────

function PageContent({
  index,
  scrollX,
  children,
}: {
  index: number;
  scrollX: SharedValue<number>;
  children: ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];
    return {
      opacity: interpolate(scrollX.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(
            scrollX.value,
            input,
            [40, 0, 40],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <View style={styles.page}>
      <Animated.View style={[styles.pageInner, animatedStyle]}>
        {children}
      </Animated.View>
    </View>
  );
}

function Dot({ index, scrollX }: { index: number; scrollX: SharedValue<number> }) {
  const animatedStyle = useAnimatedStyle(() => {
    const input = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];
    return {
      width: interpolate(scrollX.value, input, [8, 24, 8], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, input, [0.3, 1, 0.3], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

function Chip({
  emoji,
  label,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Main screen ────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Screen 2 state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    () => new Set(DEFAULT_ESSENTIALS.map((i) => i.label)),
  );

  // Screen 3 state
  const [wifiConnected, setWifiConnected] = useState<boolean | null>(null);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // Detect WiFi on mount
  useEffect(() => {
    (async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        setWifiConnected(
          state.type === Network.NetworkStateType.WIFI && !!state.isConnected,
        );
      } catch {
        setWifiConnected(false);
      }
    })();
  }, []);

  const goToPage = useCallback((page: number) => {
    (scrollRef.current as any)?.scrollTo({
      x: page * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentPage(page);
  }, []);

  const toggleItem = useCallback((label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  // Save selected items in LocalCheckItem format
  const saveItems = useCallback(async () => {
    const all = [...DEFAULT_ESSENTIALS, ...OPTIONAL_ESSENTIALS];
    const selected = all.filter((item) => selectedItems.has(item.label));
    const items = selected.map((item, i) => ({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + i,
      emoji: item.emoji,
      label: item.label,
      sortOrder: i,
      timeRule: null,
      isActive: true,
    }));
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  }, [selectedItems]);

  const handleEssentialsNext = useCallback(async () => {
    await saveItems();
    goToPage(2);
  }, [saveItems, goToPage]);

  const handleEnableTrigger = useCallback(async () => {
    const granted = await requestNotificationPermissions();
    if (granted) {
      const settings = await loadTriggerSettings();
      await saveTriggerSettings({ ...settings, enabled: true });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goToPage(3);
  }, [goToPage]);

  const handleSkipTrigger = useCallback(() => {
    goToPage(3);
  }, [goToPage]);

  const handleComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/');
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.ScrollView
        ref={scrollRef as any}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(
            e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
          );
          setCurrentPage(page);
        }}
      >
        {/* ── Page 1: Welcome ──────────────────────── */}
        <PageContent index={0} scrollX={scrollX}>
          <View style={styles.centered}>
            <Text style={styles.bigEmoji}>{'\uD83D\uDEAA'}</Text>
            <Text style={styles.pageTitle}>
              Never forget your{'\n'}keys again
            </Text>
            <Text style={styles.pageSubtitle}>
              Ubett is the 10-second habit that saves you from the daily
              {' "'}did I forget something?{'"'} panic.
            </Text>
          </View>
        </PageContent>

        {/* ── Page 2: Your Essentials ──────────────── */}
        <PageContent index={1} scrollX={scrollX}>
          <Text style={styles.pageTitle}>
            What do you grab{'\n'}on the way out?
          </Text>

          <Text style={styles.sectionLabel}>Your essentials</Text>
          <View style={styles.chipGrid}>
            {DEFAULT_ESSENTIALS.map((item) => (
              <Chip
                key={item.label}
                emoji={item.emoji}
                label={item.label}
                selected={selectedItems.has(item.label)}
                onPress={() => toggleItem(item.label)}
              />
            ))}
          </View>

          <Text style={styles.sectionLabel}>A few extras</Text>
          <View style={styles.chipGrid}>
            {OPTIONAL_ESSENTIALS.map((item) => (
              <Chip
                key={item.label}
                emoji={item.emoji}
                label={item.label}
                selected={selectedItems.has(item.label)}
                onPress={() => toggleItem(item.label)}
              />
            ))}
          </View>
        </PageContent>

        {/* ── Page 3: Smart Trigger ────────────────── */}
        <PageContent index={2} scrollX={scrollX}>
          <View style={styles.centered}>
            <Text style={styles.pageTitle}>
              We{'\u2019'}ll remind you{'\n'}when you leave
            </Text>

            <View style={styles.wifiCard}>
              <Text style={styles.wifiIcon}>
                {wifiConnected ? '\uD83D\uDCF6' : '\uD83D\uDCE1'}
              </Text>
              <Text style={styles.wifiStatus}>
                {wifiConnected === null
                  ? 'Checking WiFi\u2026'
                  : wifiConnected
                    ? 'Connected to WiFi'
                    : 'Not connected to WiFi'}
              </Text>
              {wifiConnected && <View style={styles.wifiDot} />}
            </View>

            <Text style={styles.pageSubtitle}>
              When you disconnect from your home WiFi, your checklist pops up
              automatically.
            </Text>
          </View>
        </PageContent>

        {/* ── Page 4: All Set ──────────────────────── */}
        <PageContent index={3} scrollX={scrollX}>
          <View style={styles.centered}>
            <Text style={styles.pageTitle}>
              Tomorrow morning,{'\n'}we{'\u2019'}ve got you.
            </Text>

            {/* Notification preview */}
            <View style={styles.notifCard}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifAppIcon}>{'\uD83D\uDEAA'}</Text>
                <Text style={styles.notifAppName}>UBETT</Text>
                <Text style={styles.notifTime}>now</Text>
              </View>
              <Text style={styles.notifTitle}>Heading out?</Text>
              <Text style={styles.notifBody}>
                Time for your Ubett check!
              </Text>
              <View style={styles.notifAction}>
                <Text style={styles.notifActionText}>Open Checklist</Text>
              </View>
            </View>

            <Text style={styles.pageSubtitle}>
              Your first check is ready.
            </Text>
          </View>
        </PageContent>
      </Animated.ScrollView>

      {/* ── Footer: dots + buttons ──────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} />
          ))}
        </View>

        {currentPage === 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={() => goToPage(1)}
          >
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </Pressable>
        )}

        {currentPage === 1 && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
              selectedItems.size === 0 && styles.primaryBtnDisabled,
            ]}
            onPress={handleEssentialsNext}
            disabled={selectedItems.size === 0}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
          </Pressable>
        )}

        {currentPage === 2 && (
          <View style={styles.buttonGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
              onPress={handleEnableTrigger}
            >
              <Text style={styles.primaryBtnText}>Enable Smart Trigger</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={handleSkipTrigger}>
              <Text style={styles.secondaryBtnText}>Maybe Later</Text>
            </Pressable>
          </View>
        )}

        {currentPage === 3 && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={handleComplete}
          >
            <Text style={styles.primaryBtnText}>Start Using Ubett</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  // Pages
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  pageInner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 12,
    fontFamily: 'System',
  },
  pageSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    fontFamily: 'System',
  },

  // Chips (Screen 2)
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'System',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warmWhite,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  chipSelected: {
    borderColor: colors.orange,
    backgroundColor: '#FEF3EE',
  },
  chipEmoji: {
    fontSize: 18,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkSoft,
    fontFamily: 'System',
  },
  chipLabelSelected: {
    color: colors.ink,
  },

  // WiFi card (Screen 3)
  wifiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warmWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    marginVertical: 24,
    width: '100%',
    maxWidth: 280,
  },
  wifiIcon: {
    fontSize: 24,
  },
  wifiStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
    flex: 1,
    fontFamily: 'System',
  },
  wifiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },

  // Notification preview (Screen 4)
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 24,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  notifAppIcon: {
    fontSize: 14,
  },
  notifAppName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
    letterSpacing: 0.5,
    flex: 1,
    fontFamily: 'System',
  },
  notifTime: {
    fontSize: 12,
    color: colors.inkSoft,
    fontFamily: 'System',
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 2,
    fontFamily: 'System',
  },
  notifBody: {
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: 12,
    fontFamily: 'System',
  },
  notifAction: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    alignItems: 'center',
  },
  notifActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.orange,
    fontFamily: 'System',
  },

  // Footer
  footer: {
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkSoft,
    fontFamily: 'System',
  },
});
