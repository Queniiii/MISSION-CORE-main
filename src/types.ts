export interface Task {
  id: string;
  title: string;
  categoryId: string;
  date: string; // ISO string YYYY-MM-DD
  estimatedMinutes: number;
  actualMinutes?: number;
  completed: boolean;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: '工作', color: '#B3E5FC' },
  { id: 'life', name: '生活', color: '#FFD1DC' },
  { id: 'design', name: '設計', color: '#FFF9C4' },
];
