import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors } from '@/constants/theme';
import { useChecklist, type LocalCheckItem, type TimeRule } from '@/hooks/useChecklist';
import { useStreak } from '@/hooks/useStreak';
import ChecklistCard from '@/components/ChecklistCard';
import StreakBar from '@/components/StreakBar';
import AddItemSheet from '@/components/AddItemSheet';
import ItemActionMenu from '@/components/ItemActionMenu';

export default function CheckScreen() {
  const insets = useSafeAreaInsets();
  const {
    items,
    checked,
    allChecked,
    checkedCount,
    loading,
    toggle,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
  } = useChecklist();

  const streak = useStreak();

  // Sheet state
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LocalCheckItem | null>(null);
  const [editingItem, setEditingItem] = useState<LocalCheckItem | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  if (loading || streak.loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleToggle = (id: string) => {
    // Check if this toggle will complete the list *before* toggling
    const willComplete = items.every((i) =>
      i.id === id ? !checked.has(id) : checked.has(i.id),
    );

    toggle(id);

    if (willComplete) {
      streak.recordCheck();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleLongPress = (item: LocalCheckItem) => {
    setSelectedItem(item);
    setActionMenuOpen(true);
  };

  const handleAddSubmit = (emoji: string, label: string, timeRule?: TimeRule | null) => {
    if (editingItem) {
      updateItem(editingItem.id, { emoji, label, timeRule });
      setEditingItem(null);
    } else {
      addItem(emoji, label, timeRule);
    }
  };

  const handleEdit = () => {
    if (!selectedItem) return;
    setEditingItem(selectedItem);
    setAddSheetOpen(true);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    const item = selectedItem;
    Alert.alert(
      'Delete item',
      `Remove "${item.emoji} ${item.label}" from your checklist?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteItem(item.id),
        },
      ],
    );
  };

  const handleReorder = () => {
    setIsReordering(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────── */}
        <View style={styles.header}>
          {isReordering ? (
            <View style={styles.reorderHeader}>
              <Text style={styles.title}>Reorder Items</Text>
              <Pressable style={styles.doneBtn} onPress={() => setIsReordering(false)}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.location}>{'\uD83D\uDCCD'} Leaving Home</Text>
              <Text style={styles.title}>Morning Check</Text>
              <Animated.Text
                key={allChecked ? 'done' : 'tap'}
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(150)}
                style={[styles.subtitle, allChecked && styles.subtitleDone]}
              >
                {allChecked ? '\u2713 All clear \u2014 go!' : 'Tap to confirm'}
              </Animated.Text>
            </>
          )}
        </View>

        {/* ── Progress pill ───────────────────────────── */}
        {!isReordering && (
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <Animated.View
                layout={LinearTransition.springify().damping(16)}
                style={[
                  styles.progressFill,
                  {
                    width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` as `${number}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {checkedCount}/{items.length}
            </Text>
          </View>
        )}

        {/* ── Checklist ───────────────────────────────── */}
        <View style={styles.list}>
          {items.map((item, index) => (
            <ChecklistCard
              key={item.id}
              emoji={item.emoji}
              label={item.label}
              isChecked={checked.has(item.id)}
              onToggle={() => handleToggle(item.id)}
              onLongPress={() => handleLongPress(item)}
              isReordering={isReordering}
              onMoveUp={() => reorderItems(index, index - 1)}
              onMoveDown={() => reorderItems(index, index + 1)}
              isFirst={index === 0}
              isLast={index === items.length - 1}
            />
          ))}
        </View>

        {/* ── Add button ──────────────────────────────── */}
        {!isReordering && (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            onPress={() => {
              setEditingItem(null);
              setAddSheetOpen(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={styles.addBtnIcon}>+</Text>
            <Text style={styles.addBtnLabel}>Add item</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* ── Streak bar (pinned to bottom) ─────────── */}
      {!isReordering && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <StreakBar current={streak.currentStreak} longest={streak.longestStreak} />
        </View>
      )}

      {/* ── Sheets ────────────────────────────────── */}
      <AddItemSheet
        visible={addSheetOpen}
        onClose={() => {
          setAddSheetOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleAddSubmit}
        editingItem={editingItem}
        currentItemCount={items.length}
      />

      <ItemActionMenu
        visible={actionMenuOpen}
        onClose={() => setActionMenuOpen(false)}
        onEdit={handleEdit}
        onReorder={handleReorder}
        onDelete={handleDelete}
        itemLabel={selectedItem ? `${selectedItem.emoji} ${selectedItem.label}` : ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  loadingText: {
    marginTop: 100,
    textAlign: 'center',
    color: colors.inkSoft,
    fontSize: 16,
  },

  // Header
  header: {
    marginTop: 16,
    marginBottom: 20,
  },
  reorderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  location: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.inkSoft,
    marginBottom: 4,
    fontFamily: 'System',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.inkSoft,
    marginTop: 4,
    fontFamily: 'System',
  },
  subtitleDone: {
    color: colors.green,
  },
  doneBtn: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
    minWidth: 32,
    textAlign: 'right',
    fontFamily: 'System',
  },

  // List
  list: {
    gap: 0,
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    paddingVertical: 16,
    marginTop: 4,
    gap: 8,
  },
  addBtnPressed: {
    backgroundColor: '#FFFFFF',
  },
  addBtnIcon: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.orange,
  },
  addBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.inkSoft,
    fontFamily: 'System',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.cream,
  },
});
