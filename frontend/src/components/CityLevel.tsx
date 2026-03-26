import { Fragment } from "react";
import type { CityLevelData, CityRecord, FormulaSpec, FormulaColumn } from "../types/festival";
import FormulaCell from "./FormulaCell";
import { MAJOR_CITIES } from "../constants";

interface Props {
  data: CityLevelData;
  onOverrideChange: (city: string, row: 1 | 2, spec: FormulaSpec, resolved: number) => void;
  dateLabels: Record<string, string>;
  formulaSpecs: Record<string, { row1: FormulaSpec | null; row2: FormulaSpec | null }>;
  onApplyToSubLevels: () => void;
  hasFormulas: boolean;
  showMinorCities: boolean;
  onToggleMinorCities: () => void;
  minorLoading: boolean;
}

function pct(v: number | null | undefined) {
  if (v == null) return "";
  return v.toFixed(2) + "%";
}

function keyLabel(key: string, dateLabels: Record<string, string>): string {
  if (dateLabels[key]) return dateLabels[key];
  if (key === "current") return "Current";
  return key.replace("ref", "Ref ");
}

function buildColumns(
  rec: CityRecord,
  histKeys: string[],
  dateLabels: Record<string, string>
): FormulaColumn[] {
  const cols: FormulaColumn[] = [];
  for (const k of histKeys) {
    const yd = rec.years[k];
    if (!yd) continue;
    const label = keyLabel(k, dateLabels);
    cols.push({ id: `P_${k}`, label: `Pristine ${label}`, value: yd.pristine_drop_pct ?? 0 });
    if (yd.base_corrected_drop_pct != null) {
      cols.push({ id: `BC_${k}`, label: `BC ${label}`, value: yd.base_corrected_drop_pct });
    }
  }
  return cols;
}

export default function CityLevel({
  data,
  onOverrideChange,
  dateLabels,
  formulaSpecs,
  onApplyToSubLevels,
  hasFormulas,
  showMinorCities,
  onToggleMinorCities,
  minorLoading,
}: Props) {
  const { historical_keys: hist, all_keys: allKeys, data: records } = data;

  const majorRecords = records.filter((r) => MAJOR_CITIES.has(r.city_name));
  const minorRecords = records.filter((r) => !MAJOR_CITIES.has(r.city_name));
  const totalCols = 1 + allKeys.length * 4 + hist.length * 2 + 3;

  const renderRow = (rec: CityRecord) => {
    const cols = buildColumns(rec, hist, dateLabels);
    const citySpecs = formulaSpecs[rec.city_name] ?? { row1: null, row2: null };
    return (
      <tr key={rec.city_name}>
        <td className="font-medium">{rec.city_name}</td>
        {allKeys.map((k) => {
          const yd = rec.years[k] || {};
          return (
            <Fragment key={`data-${k}`}>
              <td className="text-center">{yd.week ?? ""}</td>
              <td className="text-center">{yd.day_name ?? ""}</td>
              <td className="text-right">{yd.baseline?.toFixed(2) ?? ""}</td>
              <td className="text-right">{yd.actual?.toFixed(2) ?? ""}</td>
            </Fragment>
          );
        })}
        {hist.map((k) => (
          <td key={`pd-${k}`} className="text-right">
            {pct(rec.years[k]?.pristine_drop_pct)}
          </td>
        ))}
        {hist.map((k) => (
          <td key={`bc-${k}`} className="text-right">
            {pct(rec.years[k]?.base_corrected_drop_pct)}
          </td>
        ))}
        <td>
          <FormulaCell
            spec={citySpecs.row1}
            resolvedValue={rec.override_row1}
            columns={cols}
            onChange={(spec, resolved) => onOverrideChange(rec.city_name, 1, spec, resolved)}
          />
        </td>
        <td>
          <FormulaCell
            spec={citySpecs.row2}
            resolvedValue={rec.override_row2}
            columns={cols}
            onChange={(spec, resolved) => onOverrideChange(rec.city_name, 2, spec, resolved)}
          />
        </td>
        <td className="text-right font-bold">{pct(rec.final_impact_pct)}</td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h2 className="text-lg font-bold">City</h2>
        <div className="flex items-center gap-2">
          {hasFormulas && (
            <button
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              onClick={onApplyToSubLevels}
              title="Apply the same formula to all sub-level rows (City-SubCat, City-SubCat-Cut, City-Hub)"
            >
              Apply formula to sub-levels
            </button>
          )}
          <button
            className={`px-3 py-1 text-sm rounded transition ${
              showMinorCities
                ? "bg-gray-700 text-white hover:bg-gray-800"
                : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            }`}
            onClick={onToggleMinorCities}
            disabled={minorLoading}
          >
            {minorLoading
              ? "Loading..."
              : showMinorCities
              ? "Hide Minor Cities"
              : "Show Minor Cities"}
          </button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th rowSpan={2}>City</th>
            {allKeys.map((k) => (
              <th key={k} colSpan={4} className="text-center">
                {keyLabel(k, dateLabels)}
              </th>
            ))}
            {hist.map((k) => (
              <th key={`pd-${k}`} className="text-center">
                Pristine {keyLabel(k, dateLabels)}
              </th>
            ))}
            {hist.map((k) => (
              <th key={`bc-${k}`} className="text-center">
                Base Corr {keyLabel(k, dateLabels)}
              </th>
            ))}
            <th>Override 1</th>
            <th>Override 2</th>
            <th>Final %</th>
          </tr>
          <tr>
            {allKeys.map((k) => (
              <Fragment key={`sub-${k}`}>
                <th>Wk</th>
                <th>Day</th>
                <th>Base Rev (L)</th>
                <th>Actual Rev (L)</th>
              </Fragment>
            ))}
            {hist.map((k) => (
              <th key={`pd-sub-${k}`}>%</th>
            ))}
            {hist.map((k) => (
              <th key={`bc-sub-${k}`}>%</th>
            ))}
            <th>%</th>
            <th>%</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {/* Major cities section */}
          <tr>
            <td
              colSpan={totalCols}
              className="bg-blue-50 text-blue-800 font-semibold text-xs px-2 py-1"
            >
              Major Cities
            </td>
          </tr>
          {majorRecords.map(renderRow)}

          {/* Minor cities section — only shown when toggled on */}
          {showMinorCities && minorRecords.length > 0 && (
            <>
              <tr>
                <td
                  colSpan={totalCols}
                  className="bg-gray-50 text-gray-600 font-semibold text-xs px-2 py-1"
                >
                  Minor Cities
                </td>
              </tr>
              {minorRecords.map(renderRow)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
