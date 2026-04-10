import { useState, useCallback, useRef } from "react";
import type { AllLevelsData, TrendData, FormulaSpec } from "./types/festival";
import {
  computeDates,
  fetchTrends,
  updateCityOverrides,
  updateL2Finals,
  updateL3Finals,
  updateL4Finals,
  getExportUrl,
} from "./api/festivalApi";
import { logger, generateRequestId } from "./lib/logger";

import DateInputPanel from "./components/DateInputPanel";
import CityLevel from "./components/CityLevel";
import IndexedLevel from "./components/IndexedLevel";
import HubCutLevel from "./components/HubCutLevel";
import TrendChart from "./components/TrendChart";
import ErrorBoundary from "./components/ErrorBoundary";

type Tab = "city" | "subcat" | "subcat_cut" | "hub" | "hub_cut";

const TABS: { id: Tab; label: string }[] = [
  { id: "city", label: "City" },
  { id: "subcat", label: "City-Subcategory" },
  { id: "subcat_cut", label: "City-Subcategory-CutClass" },
  { id: "hub", label: "City-Hub" },
  { id: "hub_cut", label: "City-Hub-CutClass" },
];

// ── Formula spec stores ──────────────────────────────────────────────────────

interface CityFormulaSpecs {
  row1: FormulaSpec | null;
  row2: FormulaSpec | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve a formula spec against a row's historical year data.
 *  Column IDs are formatted as "BC_ref1", "P_ref1", "BC_ref2", etc.
 *  The prefix before the first underscore is the type (BC or P),
 *  the rest is the date key (ref1, ref2, ...).
 */
function resolveFormula(
  spec: FormulaSpec,
  years: Record<string, { pristine_drop_pct?: number; base_corrected_drop_pct?: number }>
): number {
  const underscoreIdx = spec.col.indexOf("_");
  if (underscoreIdx === -1) return spec.offset;
  const type = spec.col.slice(0, underscoreIdx);   // "BC" or "P"
  const key = spec.col.slice(underscoreIdx + 1);   // "ref1", "ref2", etc.
  const yd = years[key];
  if (!yd) return spec.offset;
  const colVal = type === "BC"
    ? (yd.base_corrected_drop_pct ?? 0)
    : (yd.pristine_drop_pct ?? 0);
  return spec.multiplier * colVal + spec.offset;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("city");
  const [data, setData] = useState<AllLevelsData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateLabels, setDateLabels] = useState<Record<string, string>>({});
  const [storeKey, setStoreKey] = useState("");

  // ── Formula spec state ─────────────────────────────────────────────────────
  // City level: keyed by city_name → { row1, row2 }
  const [cityFormulas, setCityFormulas] = useState<Record<string, CityFormulaSpecs>>({});
  // Accumulated override values — must send ALL cities each time to avoid losing others
  const cityOverrideValuesRef = useRef<Record<string, { row1?: number; row2?: number }>>({});
  // Sub-levels: keyed by composite key (e.g. "Mumbai||Fruits & Vegetables")
  const [l2Formulas, setL2Formulas] = useState<Record<string, FormulaSpec | null>>({});
  const [l3Formulas, setL3Formulas] = useState<Record<string, FormulaSpec | null>>({});
  const [l4Formulas, setL4Formulas] = useState<Record<string, FormulaSpec | null>>({});

  // ── Minor cities ───────────────────────────────────────────────────────────
  const [showMinorCities, setShowMinorCities] = useState(false);
  const [minorLoading, setMinorLoading] = useState(false);
  // ── Unmapped hubs ─────────────────────────────────────────────────────────
  const [showUnmappedHubs, setShowUnmappedHubs] = useState(false);
  // Stored dates so we can re-compute with minor cities
  const [lastCurrentDate, setLastCurrentDate] = useState("");
  const [lastReferenceDates, setLastReferenceDates] = useState<string[]>([]);

  // ── Compute ────────────────────────────────────────────────────────────────
  const handleCompute = useCallback(
    async (currentDate: string, referenceDates: string[]) => {
      const requestId = generateRequestId();
      logger.info("Tool triggered: compute", {
        requestId,
        currentDate,
        referenceDates,
      });
      setLoading(true);
      setError("");
      setTrendData(null);
      setCityFormulas({});
      cityOverrideValuesRef.current = {};
      setL2Formulas({});
      setL3Formulas({});
      setL4Formulas({});
      setShowMinorCities(false);
      setShowUnmappedHubs(false);
      setLastCurrentDate(currentDate);
      setLastReferenceDates(referenceDates);
      try {
        const result = await computeDates(
          currentDate,
          referenceDates,
          undefined,
          false,
          requestId
        );
        setData(result);
        setStoreKey(result.store_key);
        setTab("city");

        const labels: Record<string, string> = { current: currentDate };
        referenceDates.forEach((d, i) => {
          labels[`ref${i + 1}`] = d;
        });
        setDateLabels(labels);

        logger.info("Compute complete, fetching trends", { requestId });
        fetchTrends(referenceDates, undefined, requestId)
          .then(setTrendData)
          .catch((e) => {
            logger.warn("Trends fetch failed (non-blocking)", {
              requestId,
              error: e instanceof Error ? e.message : String(e),
            });
          });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Computation failed";
        logger.error("Compute failed", { requestId, error: msg });
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── Toggle minor cities ────────────────────────────────────────────────────
  const handleToggleMinorCities = useCallback(async () => {
    if (showMinorCities) {
      setShowMinorCities(false);
      return;
    }
    if (!lastCurrentDate) {
      logger.warn("Toggle minor cities: no last dates");
      return;
    }
    const requestId = generateRequestId();
    logger.info("Toggle minor cities: re-compute", { requestId });
    setMinorLoading(true);
    try {
      const result = await computeDates(
        lastCurrentDate,
        lastReferenceDates,
        undefined,
        true,
        requestId
      );
      setData(result);
      setStoreKey(result.store_key);
      setShowMinorCities(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load minor cities";
      logger.error("Minor cities failed", { requestId, error: msg });
      setError(msg);
    } finally {
      setMinorLoading(false);
    }
  }, [showMinorCities, lastCurrentDate, lastReferenceDates]);

  // ── City override (Issue 1 + 3 fix) ───────────────────────────────────────
  const handleCityOverride = useCallback(
    async (city: string, row: 1 | 2, spec: FormulaSpec, resolved: number) => {
      if (!data || !storeKey) return;

      // Store the formula spec
      setCityFormulas((prev) => ({
        ...prev,
        [city]: {
          ...(prev[city] ?? { row1: null, row2: null }),
          [row === 1 ? "row1" : "row2"]: spec,
        },
      }));

      const rowKey = row === 1 ? "row1" : "row2";
      // Accumulate: update this city's value in the ref (backend replaces, doesn't merge)
      const prev = cityOverrideValuesRef.current;
      cityOverrideValuesRef.current = {
        ...prev,
        [city]: {
          ...(prev[city] ?? {}),
          [rowKey]: resolved,
        },
      };

      // Build FULL overrides for ALL cities so we don't lose any
      const overrides: Record<string, Record<string, { direct: number }>> = {
        row1: {},
        row2: {},
      };
      for (const [c, vals] of Object.entries(cityOverrideValuesRef.current)) {
        if (vals.row1 != null) overrides.row1[c] = { direct: vals.row1 };
        if (vals.row2 != null) overrides.row2[c] = { direct: vals.row2 };
      }

      try {
        const result = await updateCityOverrides(storeKey, overrides);
        setData((prev) => (prev ? { ...prev, ...result } : prev));
      } catch (e) {
        logger.error("City override update failed", {
          city,
          row,
          error: e instanceof Error ? e.message : String(e),
        });
        setError(e instanceof Error ? e.message : "Override update failed");
      }
    },
    [data, storeKey]
  );

  // ── Apply formula to sub-levels (Issue 3) ─────────────────────────────────
  const handleApplyFormulaToSubLevels = useCallback(async () => {
    if (!data || !storeKey) return;

    // For each city that has a row1 formula, propagate the same formula
    // expression to all L2, L3, L4 rows belonging to that city.
    const l2Finals: Record<string, number> = {};
    const l3Finals: Record<string, number> = {};
    const l4Finals: Record<string, number> = {};

    const newL2Formulas: Record<string, FormulaSpec | null> = { ...l2Formulas };
    const newL3Formulas: Record<string, FormulaSpec | null> = { ...l3Formulas };
    const newL4Formulas: Record<string, FormulaSpec | null> = { ...l4Formulas };

    for (const [city, specs] of Object.entries(cityFormulas)) {
      const formula = specs.row1; // Use row1 formula as the "primary" formula to propagate
      if (!formula) continue;

      // Apply to L2 (City-SubCat)
      for (const rec of data.subcat.data) {
        if (rec.city_name !== city) continue;
        const resolved = resolveFormula(formula, rec.years);
        const key = `${city}||${rec.sub_category}`;
        l2Finals[key] = resolved;
        newL2Formulas[key] = formula;
      }

      // Apply to L3 (City-SubCat-Cut)
      for (const rec of data.subcat_cut.data) {
        if (rec.city_name !== city) continue;
        const resolved = resolveFormula(formula, rec.years);
        const key = `${city}||${rec.sub_category}||${rec.cut_class}`;
        l3Finals[key] = resolved;
        newL3Formulas[key] = formula;
      }

      // Apply to L4 (City-Hub)
      for (const rec of data.hub.data) {
        if (rec.city_name !== city) continue;
        const resolved = resolveFormula(formula, rec.years);
        const key = `${city}||${rec.hub_name}`;
        l4Finals[key] = resolved;
        newL4Formulas[key] = formula;
      }
    }

    setL2Formulas(newL2Formulas);
    setL3Formulas(newL3Formulas);
    setL4Formulas(newL4Formulas);

    try {
      if (Object.keys(l2Finals).length > 0) {
        const r2 = await updateL2Finals(storeKey, l2Finals);
        setData((prev) => (prev ? { ...prev, ...r2 } : prev));
      }
      if (Object.keys(l3Finals).length > 0) {
        const r3 = await updateL3Finals(storeKey, l3Finals);
        setData((prev) => (prev ? { ...prev, ...r3 } : prev));
      }
      if (Object.keys(l4Finals).length > 0) {
        const r4 = await updateL4Finals(storeKey, l4Finals);
        setData((prev) => (prev ? { ...prev, ...r4 } : prev));
      }
    } catch (e) {
      logger.error("Apply formula to sub-levels failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      setError("Failed to apply formula to sub-levels");
    }
  }, [data, storeKey, cityFormulas, l2Formulas, l3Formulas, l4Formulas]);

  // ── L2/L3/L4 final changes ─────────────────────────────────────────────────
  const handleL2Final = useCallback(
    async (key: string, spec: FormulaSpec, resolved: number) => {
      if (!storeKey) return;
      setL2Formulas((prev) => ({ ...prev, [key]: spec }));
      try {
        const result = await updateL2Finals(storeKey, { [key]: resolved });
        setData((prev) => (prev ? { ...prev, ...result } : prev));
      } catch (e) {
        logger.error("L2 final update failed", {
          key,
          error: e instanceof Error ? e.message : String(e),
        });
        setError("Failed to update L2 final");
      }
    },
    [storeKey]
  );

  const handleL3Final = useCallback(
    async (key: string, spec: FormulaSpec, resolved: number) => {
      if (!storeKey) return;
      setL3Formulas((prev) => ({ ...prev, [key]: spec }));
      try {
        const result = await updateL3Finals(storeKey, { [key]: resolved });
        setData((prev) => (prev ? { ...prev, ...result } : prev));
      } catch (e) {
        logger.error("L3 final update failed", {
          key,
          error: e instanceof Error ? e.message : String(e),
        });
        setError("Failed to update L3 final");
      }
    },
    [storeKey]
  );

  const handleL4Final = useCallback(
    async (key: string, spec: FormulaSpec, resolved: number) => {
      if (!storeKey) return;
      setL4Formulas((prev) => ({ ...prev, [key]: spec }));
      try {
        const result = await updateL4Finals(storeKey, { [key]: resolved });
        setData((prev) => (prev ? { ...prev, ...result } : prev));
      } catch (e) {
        logger.error("L4 final update failed", {
          key,
          error: e instanceof Error ? e.message : String(e),
        });
        setError("Failed to update L4 final");
      }
    },
    [storeKey]
  );

  const hasFormulas = Object.keys(cityFormulas).some(
    (c) => cityFormulas[c].row1 !== null || cityFormulas[c].row2 !== null
  );

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Festival Impact Planning
        </h1>
        {data && (
          <a
            href={getExportUrl(storeKey)}
            className="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition"
          >
            Export Excel
          </a>
        )}
      </div>

      {/* Date Inputs */}
      <div className="mb-6 bg-white rounded border border-gray-300 p-4">
        <DateInputPanel onCompute={handleCompute} loading={loading} />
      </div>

      {loading && (
        <div className="text-center py-20 text-gray-500">
          <div className="animate-pulse text-lg mb-2">Computing festival impact...</div>
          <div className="text-sm">
            First run loads data from source files and may take several minutes. Subsequent runs will be faster.
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded p-4 mb-4">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 border-b border-gray-300">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`px-4 py-2 text-sm font-medium rounded-t transition ${
                  tab === t.id
                    ? "bg-white border border-b-white border-gray-300 -mb-px text-blue-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content — error boundary for pipeline output */}
          <ErrorBoundary>
          <div className="bg-white rounded-b border border-gray-300 p-4 overflow-auto max-h-[75vh]">
            {tab === "city" && (
              <>
                {trendData && data.city.cities && (
                  <TrendChart trendData={trendData} cities={data.city.cities} />
                )}
                <CityLevel
                  data={data.city}
                  onOverrideChange={handleCityOverride}
                  dateLabels={dateLabels}
                  formulaSpecs={cityFormulas}
                  onApplyToSubLevels={handleApplyFormulaToSubLevels}
                  hasFormulas={hasFormulas}
                  showMinorCities={showMinorCities}
                  onToggleMinorCities={handleToggleMinorCities}
                  minorLoading={minorLoading}
                />
              </>
            )}

            {tab === "subcat" && (
              <IndexedLevel
                title="City-Subcategory"
                data={data.subcat}
                groupFields={[
                  { key: "city_name", label: "City" },
                  { key: "sub_category", label: "Sub Category" },
                ]}
                parentDropLabel="City Drop %"
                onFinalChange={handleL2Final}
                dateLabels={dateLabels}
                formulaSpecs={l2Formulas}
                showMinorCities={showMinorCities}
                onToggleMinorCities={handleToggleMinorCities}
                minorLoading={minorLoading}
              />
            )}

            {tab === "subcat_cut" && (
              <IndexedLevel
                title="City-Subcategory-CutClass"
                data={data.subcat_cut}
                groupFields={[
                  { key: "city_name", label: "City" },
                  { key: "sub_category", label: "Sub Category" },
                  { key: "cut_class", label: "Cut Class" },
                ]}
                parentDropLabel="SubCat Drop %"
                onFinalChange={handleL3Final}
                dateLabels={dateLabels}
                formulaSpecs={l3Formulas}
                showMinorCities={showMinorCities}
                onToggleMinorCities={handleToggleMinorCities}
                minorLoading={minorLoading}
              />
            )}

            {tab === "hub" && (
              <IndexedLevel
                title="City-Hub"
                data={data.hub}
                groupFields={[
                  { key: "city_name", label: "City" },
                  { key: "hub_name", label: "Hub" },
                ]}
                parentDropLabel="City Drop %"
                onFinalChange={handleL4Final}
                dateLabels={dateLabels}
                formulaSpecs={l4Formulas}
                showMinorCities={showMinorCities}
                onToggleMinorCities={handleToggleMinorCities}
                minorLoading={minorLoading}
                showUnmappedHubs={showUnmappedHubs}
                onToggleUnmappedHubs={() => setShowUnmappedHubs((v) => !v)}
              />
            )}

            {tab === "hub_cut" && (
              <HubCutLevel
                data={data.hub_cut}
                showMinorCities={showMinorCities}
                onToggleMinorCities={handleToggleMinorCities}
                minorLoading={minorLoading}
                showUnmappedHubs={showUnmappedHubs}
                onToggleUnmappedHubs={() => setShowUnmappedHubs((v) => !v)}
              />
            )}
          </div>
          </ErrorBoundary>
        </>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-20 text-gray-400">
          Enter dates above to begin planning.
        </div>
      )}
    </div>
  );
}
