/* ── Formula spec for editable cells ─────────────────────────────── */

export interface FormulaSpec {
  col: string;        // e.g. "BC_ref1", "P_ref2"
  multiplier: number; // default 1
  offset: number;     // default 0
}

export interface FormulaColumn {
  id: string;         // e.g. "BC_ref1"
  label: string;      // e.g. "BC 2025-03-14"
  value: number;      // the resolved numeric value
}

/* ── Year-level metrics (shared across levels) ─────────────────────── */

export interface YearData {
  week?: number;
  day_name?: string;
  date?: string;
  baseline: number;
  actual: number;
  pristine_drop_pct: number;
  base_corrected_drop_pct?: number;
}

/* ── Level 1: City ────────────────────────────────────────────────── */

export interface CityRecord {
  city_name: string;
  years: Record<string, YearData>;
  override_row1: number;
  override_row2: number;
  final_impact_pct: number;
}

export interface CityLevelData {
  festival_name: string;
  current_key: string;
  historical_keys: string[];
  all_keys: string[];
  cities: string[];
  data: CityRecord[];
}

/* ── Levels 2-4: Indexed levels ───────────────────────────────────── */

export interface IndexedRecord {
  city_name: string;
  sub_category?: string;
  hub_name?: string;
  cut_class?: string;
  years: Record<string, YearData>;
  final_pct: number;
  drop_with_current_pct: number;
  city_drop_pct?: number;
  subcat_drop_pct?: number;
  final_after_indexing_pct: number;
}

export interface IndexedLevelData {
  festival_name: string;
  current_key: string;
  historical_keys: string[];
  all_keys: string[];
  data: IndexedRecord[];
}

/* ── Level 5: Hub-Cut (derived) ───────────────────────────────────── */

export interface HubCutRecord {
  city_name: string;
  hub_name: string;
  sub_category: string;
  cut_class: string;
  baseline: number;
  hub_drop_pct: number;
  drop_with_current_pct: number;
  target_subcat_cut_drop_pct: number;
  final_after_indexing_pct: number;
  final_rev: number;
}

export interface HubCutLevelData {
  festival_name: string;
  current_key: string;
  all_keys: string[];
  data: HubCutRecord[];
}

/* ── Full computation response ────────────────────────────────────── */

export interface AllLevelsData {
  store_key: string;
  include_minor: boolean;
  city: CityLevelData;
  subcat: IndexedLevelData;
  subcat_cut: IndexedLevelData;
  hub: IndexedLevelData;
  hub_cut: HubCutLevelData;
}

/* ── Trend data ───────────────────────────────────────────────────── */

export interface TrendPoint {
  day_offset: number;
  date: string;
  sales: number;
  baseline: number;
  pct_change: number;
  std_pct: number;
}

export interface TrendData {
  trends: Record<string, Record<string, TrendPoint[]>>;
}
