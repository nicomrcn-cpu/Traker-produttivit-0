export interface MacroCategory {
  id: string;
  name: string;
  color: string; // e.g. '#3b82f6' for Blu, '#22c55e' for Verde, '#a855f7' for Viola
  icon: string;  // name of Lucide icon
  userId: string;
  createdAt: number;
}

export interface SubActivity {
  id: string;
  categoryId: string;
  name: string;
  weeklyTarget: number; // 1 to 7 (frequenza settimanale)
  weight: number;       // Peso % (es. 50 per 50%)
  dailyValuation: boolean; // se tracciata giornalmente
  userId: string;
  createdAt: number;
  // Time-Bound Fields
  type?: 'recurring' | 'temporary'; // 'recurring' (always) or 'temporary' (time-bound)
  validityType?: 'week' | 'month';  // 'week' (single week) or 'month' (single month)
  validityPeriod?: string;           // "YYYY-Www" or "YYYY-MM"
}

export interface ActivityLog {
  id: string;
  subActivityId: string;
  categoryId: string;
  date: string;         // YYYY-MM-DD
  score: number;        // 1 to 10
  userId: string;
  timestamp: number;
  // Historical Snapshots
  weightSnap?: number;
  weeklyTargetSnap?: number;
}

export const DEFAULT_CATEGORIES = [
  { name: 'Dieta', color: '#22c55e', icon: 'Apple' },             // Verde
  { name: 'Sonno', color: '#a855f7', icon: 'Moon' },              // Viola
  { name: 'Studio', color: '#3b82f6', icon: 'BookOpen' },         // Blu
  { name: 'Palestra', color: '#ec4899', icon: 'Dumbbell' },       // Viola/Fucsia (Let's use vibrant colors!)
  { name: 'Socialità', color: '#06b6d4', icon: 'Users' },         // Blu/Azzurro
  { name: 'Benessere Psicologico', color: '#8b5cf6', icon: 'Brain' }, // Viola
  { name: 'Ordine', color: '#3b82f6', icon: 'CheckCircle' }          // Blu
];

export const AVAILABLE_ICONS = [
  'Apple',
  'Moon',
  'BookOpen',
  'Dumbbell',
  'Users',
  'Brain',
  'CheckCircle',
  'Heart',
  'GraduationCap',
  'Coins',
  'Briefcase',
  'Flame',
  'Running', // Or 'Activity'
  'Activity',
  'Trophy'
];

export const AVAILABLE_COLORS = [
  '#3b82f6', // Blu Primario
  '#1d4ed8', // Blu Scuro
  '#22c55e', // Verde Secondario
  '#15803d', // Verde Scuro
  '#a855f7', // Viola Secondario
  '#7c3aed', // Viola Scuro
  '#ec4899', // Rosa Vibrante
  '#f43f5e', // Rosso/Rosa
  '#06b6d4', // Ciano
  '#eab308'  // Giallo
];
