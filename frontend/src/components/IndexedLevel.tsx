import { Fragment } from "react";
import type { IndexedLevelData, IndexedRecord, FormulaSpec, FormulaColumn } from "../types/festival";
import FormulaCell from "./FormulaCell";
import { MAJOR_CITIES } from "../constants";

interface Props {
  title: string;
  data: IndexedLevelData;
  groupFields: { key: keyof IndexedRecord; label: string }[];
  parentDropLabel: string;
  onFinalChange: (key: string, spec: FormulaSpec, resolved: number) => void;
  dateLabels: Record<string, string>;
  formulaSpecs: Record<string, FormulaSpec | null>;
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
  rec: IndexedRecord,
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

export default function IndexedLevel({
  title,
  data,
  groupFields,
  parentDropLabel,
  onFinalChange,
  dateLabels,
  formulaSpecs,
  showMinorCities,
  onToggleMinorCities,
  minorLoading,
}: Props) {
  const { historical_keys: hist, current_key: curKey, data: records } = data;

  const makeKey = (rec: IndexedRecord) =>
    groupFields.map((f) => rec[f.key] ?? "").join("||");

  const majorRecords = records.filter((r) => MAJOR_CITIES.has(r.city_name));
  const minorRecords = records.filter((r) => !MAJOR_CITIES.has(r.city_name));
  const totalCols = groupFields.length + hist.length * 3 + hist.length + 1 + 4;

  const renderRow = (rec: IndexedRecord) => {
    const key = makeKey(rec);
    const cols = buildColumns(rec, hist, dateLabels);
    const spec = formulaSpecs[key] ?? null;
    return (
      <tr key={key}>
        {groupFields.map((f) => (
          <td key={f.key as string} className="font-medium">
            {String(rec[f.key] ?? "")}
          </td>
        ))}
        {hist.map((k) => {
          const yd = rec.years[k] || {};
          return (
            <Fragment key={`data-${k}`}>
              <td className="text-right">{yd.baseline?.toFixed(2)}</td>
              <td className="text-right">{yd.actual?.toFixed(2)}</td>
              <td className="text-right">{pct(yd.pristine_drop_pct)}</td>
            </Fragment>
          );
        })}
        {hist.map((k) => (
          <td key={`bc-${k}`} className="text-right">
            {pct(rec.years[k]?.base_corrected_drop_pct)}
          </td>
        ))}
        <td className="text-right">
          {(rec.years[curKey]?.baseline ?? 0).toFixed(2)}
        </td>
        <td>
          <FormulaCell
            spec={spec}
            resolvedValue={rec.final_pct}
            columns={cols}
            onChange={(s, resolved) => onFinalChange(key, s, resolved)}
          />
        </td>
        <td className="text-right">{pct(rec.drop_with_current_pct)}</td>
        <td className="text-right">
          {pct(rec.city_drop_pct ?? rec.subcat_drop_pct ?? 0)}
        </td>
        <td className="text-right font-bold">{pct(rec.final_after_indexing_pct)}</td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">{title}</h2>
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

      <table>
        <thead>
          <tr>
            {groupFields.map((f) => (
              <th key={f.key as string}>{f.label}</th>
            ))}
            {hist.map((k) => (
              <Fragment key={`hdr-${k}`}>
                <th>Base Rev (L) {keyLabel(k, dateLabels)}</th>
                <th>Fest Rev (L) {keyLabel(k, dateLabels)}</th>
                <th>Drop {keyLabel(k, dateLabels)}</th>
              </Fragment>
            ))}
            {hist.map((k) => (
              <th key={`bc-${k}`}>Base Corr {keyLabel(k, dateLabels)}</th>
            ))}
            <th>Base Rev (L) {keyLabel(curKey, dateLabels)}</th>
            <th className="bg-yellow-100">Final %</th>
            <th>Drop w/ Current</th>
            <th>{parentDropLabel}</th>
            <th>After Indexing %</th>
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

          {/* Minor cities section */}
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
