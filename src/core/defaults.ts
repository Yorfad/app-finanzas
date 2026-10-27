import type { Category, TxType } from './types';

/** Fecha antigua: cualquier edición del usuario gana al sincronizar contra estas semillas. */
const SEED_DATE = '2000-01-01T00:00:00.000Z';

export const FALLBACK_CATEGORY: Record<TxType, string> = {
  expense: 'cat-other',
  income: 'cat-other-income',
};

export const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#64748b',
];

type Seed = Pick<Category, 'id' | 'name' | 'type' | 'icon' | 'color' | 'keywords'>;

const SEEDS: Seed[] = [
  { id: 'cat-food', name: 'Comida', type: 'expense', icon: '🍔', color: '#f97316',
    keywords: ['super', 'mercado', 'restaurante', 'almuerzo', 'cena', 'desayuno', 'cafe', 'pizza', 'comida', 'panaderia', 'delivery', 'rappi', 'didi food', 'uber eats'] },
  { id: 'cat-transport', name: 'Transporte', type: 'expense', icon: '🚗', color: '#0ea5e9',
    keywords: ['uber', 'didi', 'cabify', 'taxi', 'gasolina', 'nafta', 'combustible', 'bus', 'metro', 'peaje', 'parqueo', 'estacionamiento', 'pasaje'] },
  { id: 'cat-home', name: 'Casa', type: 'expense', icon: '🏠', color: '#6366f1',
    keywords: ['alquiler', 'renta', 'arriendo', 'hipoteca', 'luz', 'agua', 'gas', 'internet', 'telefono', 'celular', 'limpieza', 'expensas'] },
  { id: 'cat-health', name: 'Salud', type: 'expense', icon: '💊', color: '#22c55e',
    keywords: ['farmacia', 'medico', 'doctor', 'dentista', 'seguro', 'clinica', 'hospital', 'gimnasio', 'gym'] },
  { id: 'cat-fun', name: 'Ocio', type: 'expense', icon: '🎉', color: '#a855f7',
    keywords: ['cine', 'netflix', 'spotify', 'disney', 'bar', 'fiesta', 'juego', 'concierto', 'viaje', 'hotel', 'cerveza'] },
  { id: 'cat-shopping', name: 'Compras', type: 'expense', icon: '🛍️', color: '#ec4899',
    keywords: ['ropa', 'zapatos', 'amazon', 'mercadolibre', 'tienda', 'regalo'] },
  { id: 'cat-education', name: 'Educación', type: 'expense', icon: '📚', color: '#eab308',
    keywords: ['curso', 'libro', 'colegio', 'universidad', 'matricula', 'escuela'] },
  { id: 'cat-other', name: 'Otros', type: 'expense', icon: '📦', color: '#64748b', keywords: [] },
  { id: 'cat-salary', name: 'Salario', type: 'income', icon: '💼', color: '#14b8a6',
    keywords: ['salario', 'sueldo', 'nomina', 'quincena', 'pago mensual'] },
  { id: 'cat-extra', name: 'Extras', type: 'income', icon: '💰', color: '#22c55e',
    keywords: ['venta', 'freelance', 'bono', 'reembolso', 'propina', 'regalo', 'intereses'] },
  { id: 'cat-other-income', name: 'Otros ingresos', type: 'income', icon: '➕', color: '#64748b', keywords: [] },
];

export const defaultCategories = (): Category[] =>
  SEEDS.map((s) => ({ ...s, createdAt: SEED_DATE, updatedAt: SEED_DATE }));
