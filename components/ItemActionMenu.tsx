import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import BottomSheet from './BottomSheet';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onReorder: () => void;
  onDelete: () => void;
  itemLabel: string;
}

interface ActionRowProps {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

function ActionRow({ icon, label, destructive, onPress }: ActionRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
    </Pressable>
  );
}

export default function ItemActionMenu({
  visible,
  onClose,
  onEdit,
  onReorder,
  onDelete,
  itemLabel,
}: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{itemLabel}</Text>

      <View style={styles.actions}>
        <ActionRow
          icon={'\u270F\uFE0F'}
          label="Edit"
          onPress={() => {
            onClose();
            setTimeout(onEdit, 320);
          }}
        />
        <ActionRow
          icon={'\u2195\uFE0F'}
          label="Reorder"
          onPress={() => {
            onClose();
            setTimeout(onReorder, 320);
          }}
        />
        <View style={styles.separator} />
        <ActionRow
          icon={'\uD83D\uDDD1\uFE0F'}
          label="Delete"
          destructive
          onPress={() => {
            onClose();
            setTimeout(onDelete, 320);
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 16,
  },
  actions: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  rowPressed: {
    backgroundColor: colors.cream,
  },
  rowIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
  },
  rowLabelDestructive: {
    color: '#D94040',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
});
