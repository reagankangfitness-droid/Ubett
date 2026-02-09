export const colors = {
  cream: '#FDF6EC',
  warmWhite: '#FEFCF7',
  ink: '#1A1612',
  inkSoft: '#4A4238',
  orange: '#E85D26',
  green: '#2D8B5F',
  border: '#E8DFD0',
} as const;

export type ColorName = keyof typeof colors;
