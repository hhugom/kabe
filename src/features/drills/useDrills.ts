import { useMemo } from 'react';
import { asc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db, schema } from '@/db/client';
import type { Drill, DrillCategory } from '@/db/schema';

export const CATEGORY_LABELS: Record<DrillCategory, string> = {
  groundstroke: 'Groundstrokes',
  volley: 'Volleys & net',
  specialty: 'Specialty',
};

const CATEGORY_ORDER: DrillCategory[] = ['groundstroke', 'volley', 'specialty'];

export type DrillGroup = { category: DrillCategory; label: string; drills: Drill[] };

export function useDrills(search: string) {
  const { data } = useLiveQuery(db.select().from(schema.drills).orderBy(asc(schema.drills.name)));

  return useMemo<DrillGroup[]>(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? data.filter((d) => d.name.toLowerCase().includes(q)) : data;

    return CATEGORY_ORDER.map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      drills: filtered.filter((d) => d.category === category),
    })).filter((g) => g.drills.length > 0);
  }, [data, search]);
}
