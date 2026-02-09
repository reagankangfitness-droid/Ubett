import { useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import { FREE_TIER_LIMIT, type LocalCheckItem, type TimeRule } from '@/hooks/useChecklist';
import BottomSheet from './BottomSheet';

const EMOJI_OPTIONS = [
  '\uD83D\uDCF1', '\uD83D\uDC5B', '\uD83D\uDD11', '\uD83D\uDC8A',
  '\uD83E\uDD57', '\uD83D\uDCBB', '\uD83C\uDF92', '\uD83E\uDDF4',
  '\u2602\uFE0F', '\uD83D\uDCC4', '\uD83E\uDEAA', '\uD83D\uDCB3',
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (emoji: string, label: string, timeRule?: TimeRule | null) => void;
  editingItem?: LocalCheckItem | null;
  currentItemCount: number;
}

export default function AddItemSheet({
  visible,
  onClose,
  onSubmit,
  editingItem,
  currentItemCount,
}: Props) {
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [label, setLabel] = useState('');
  const [showTimeRule, setShowTimeRule] = useState(false);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('09:00');

  // Reset form when opened / populate when editing
  useEffect(() => {
    if (visible) {
      if (editingItem) {
        setEmoji(editingItem.emoji);
        setLabel(editingItem.label);
        if (editingItem.timeRule) {
          setShowTimeRule(true);
          setDays(editingItem.timeRule.days);
          setStartTime(editingItem.timeRule.start);
          setEndTime(editingItem.timeRule.end);
        } else {
          setShowTimeRule(false);
          setDays([1, 2, 3, 4, 5]);
          setStartTime('07:00');
          setEndTime('09:00');
        }
      } else {
        setEmoji(EMOJI_OPTIONS[0]);
        setLabel('');
        setShowTimeRule(false);
        setDays([1, 2, 3, 4, 5]);
        setStartTime('07:00');
        setEndTime('09:00');
      }
    }
  }, [visible, editingItem]);

  const isEditing = !!editingItem;
  const atLimit = !isEditing && currentItemCount >= FREE_TIER_LIMIT;

  const toggleDay = (day: number) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSubmit = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      Alert.alert('Enter a name', 'Give your item a label.');
      return;
    }
    if (atLimit) {
      Alert.alert(
        'Free tier limit',
        `You can have up to ${FREE_TIER_LIMIT} items on the free plan. Upgrade to add more!`,
      );
      return;
    }

    const timeRule: TimeRule | null = showTimeRule ? { days, start: startTime, end: endTime } : null;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSubmit(emoji, trimmed, timeRule);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        <Text style={styles.sheetTitle}>{isEditing ? 'Edit Item' : 'Add Item'}</Text>

        {/* ── Emoji Picker ─────────────────────── */}
        <Text style={styles.sectionLabel}>Choose an emoji</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((e) => (
            <Pressable
              key={e}
              style={[styles.emojiCell, e === emoji && styles.emojiSelected]}
              onPress={() => {
                setEmoji(e);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Label Input ──────────────────────── */}
        <Text style={styles.sectionLabel}>Item name</Text>
        <TextInput
          style={styles.input}
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Laptop charger"
          placeholderTextColor={colors.inkSoft + '80'}
          maxLength={30}
          autoCapitalize="words"
        />

        {/* ── Time Rule (Optional) ─────────────── */}
        <Pressable
          style={styles.timeToggle}
          onPress={() => setShowTimeRule((p) => !p)}
        >
          <Text style={styles.timeToggleText}>
            {showTimeRule ? '\u25BC' : '\u25B6'} Schedule (optional)
          </Text>
        </Pressable>

        {showTimeRule && (
          <View style={styles.timeSection}>
            <Text style={styles.timeLabel}>Days</Text>
            <View style={styles.dayRow}>
              {DAY_LABELS.map((d, i) => (
                <Pressable
                  key={d}
                  style={[styles.dayPill, days.includes(i) && styles.dayPillActive]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayText, days.includes(i) && styles.dayTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.timeLabel}>Time range</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="07:00"
                placeholderTextColor={colors.inkSoft + '80'}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
              <Text style={styles.timeDash}>{'\u2013'}</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="09:00"
                placeholderTextColor={colors.inkSoft + '80'}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
        )}

        {/* ── Limit warning ────────────────────── */}
        {atLimit && (
          <View style={styles.limitBanner}>
            <Text style={styles.limitText}>
              {FREE_TIER_LIMIT}/{FREE_TIER_LIMIT} items used {'\u2014'} upgrade for more
            </Text>
          </View>
        )}

        {/* ── Submit ───────────────────────────── */}
        <Pressable
          style={[styles.submitBtn, atLimit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={atLimit}
        >
          <Text style={styles.submitText}>{isEditing ? 'Save Changes' : 'Add Item'}</Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 20,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  // Emoji grid
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  emojiCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.cream,
  },
  emojiText: {
    fontSize: 24,
  },

  // Input
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },

  // Time rule toggle
  timeToggle: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  timeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.inkSoft,
  },

  // Time rule section
  timeSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  dayPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.cream,
    alignItems: 'center',
  },
  dayPillActive: {
    backgroundColor: colors.orange,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeInput: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
  },
  timeDash: {
    fontSize: 16,
    color: colors.inkSoft,
  },

  // Limit banner
  limitBanner: {
    backgroundColor: colors.orange + '15',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  limitText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.orange,
    textAlign: 'center',
  },

  // Submit
  submitBtn: {
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
