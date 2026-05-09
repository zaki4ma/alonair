export const Colors = {
  bg: '#F5F6FA',
  card: '#FFFFFF',
  charcoal: '#37474F',
  slate: '#90A4AE',
  pillBg: '#F0F0F8',
  line: '#E8EAF0',
} as const;

export const Categories = {
  study: { id: 'study', label: '学習', emoji: '📚', color: '#5C6BC0', avatar: '#9FA8DA' },
  work:  { id: 'work',  label: '作業', emoji: '💻', color: '#546E7A', avatar: '#90A4AE' },
  read:  { id: 'read',  label: '読書', emoji: '📖', color: '#7E57C2', avatar: '#B39DDB' },
  gym:   { id: 'gym',   label: 'ジム', emoji: '🏋️', color: '#FF7043', avatar: '#FFAB91' },
  walk:  { id: 'walk',  label: '散歩', emoji: '🚶', color: '#66BB6A', avatar: '#A5D6A7' },
  fish:  { id: 'fish',  label: '釣り', emoji: '🎣', color: '#26A69A', avatar: '#80CBC4' },
  drink: { id: 'drink', label: '飲み', emoji: '🍺', color: '#FFA726', avatar: '#FFCC80' },
  cook:  { id: 'cook',  label: '料理', emoji: '🍳', color: '#EC407A', avatar: '#F48FB1' },
  make:  { id: 'make',  label: '創作', emoji: '🎨', color: '#C0CA33', avatar: '#E6EE9C' },
  misc:  { id: 'misc',  label: 'その他', emoji: '✦', color: '#90A4AE', avatar: '#B0BEC5' },
} as const;

export type CategoryId = keyof typeof Categories;
