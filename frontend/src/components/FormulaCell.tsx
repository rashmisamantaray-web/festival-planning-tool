import { useState, useEffect } from "react";
import type { FormulaSpec, FormulaColumn } from "../types/festival";

interface Props {
  /** Current formula spec (or null if no formula set yet) */
  spec: FormulaSpec | null;
  /** Resolved numeric value to display when not editing */
  resolvedValue: number;
  /** Available columns the user can reference */
  columns: FormulaColumn[];
  /** Called when the formula changes; parent resolves the value */
  onChange: (spec: FormulaSpec, resolved: number) => void;
}

function resolveSpec(spec: FormulaSpec, columns: FormulaColumn[]): number {
  const col = columns.find((c) => c.id === spec.col);
  if (!col) return spec.offset;
  return spec.multiplier * col.value + spec.offset;
}

export default function FormulaCell({ spec, resolvedValue, columns, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  const defaultCol = columns.length > 0 ? columns[0].id : "";
  const [localSpec, setLocalSpec] = useState<FormulaSpec>(
    spec ?? { col: defaultCol, multiplier: 1, offset: 0 }
  );

  // Sync if parent spec changes
  useEffect(() => {
    if (spec) setLocalSpec(spec);
  }, [spec]);

  // Sync default col if columns arrive after mount
  useEffect(() => {
    if (!spec && columns.length > 0 && localSpec.col === "") {
      setLocalSpec((s) => ({ ...s, col: columns[0].id }));
    }
  }, [columns, spec, localSpec.col]);

  const commit = () => {
    setEditing(false);
    const resolved = resolveSpec(localSpec, columns);
    onChange(localSpec, resolved);
  };

  const formulaLabel = () => {
    if (!spec) return resolvedValue.toFixed(2) + "%";
    const parts: string[] = [];
    if (spec.multiplier !== 1) parts.push(`${spec.multiplier}×${spec.col}`);
    else parts.push(spec.col);
    if (spec.offset !== 0) parts.push((spec.offset >= 0 ? "+" : "") + spec.offset);
    return parts.join(" ");
  };

  if (!editing) {
    return (
      <span
        className="cursor-pointer px-1 py-0.5 rounded bg-yellow-50 border border-yellow-300 inline-block min-w-[80px] text-right text-xs"
        onClick={() => setEditing(true)}
        title={`Formula: ${formulaLabel()} = ${resolvedValue.toFixed(2)}%\nClick to edit`}
      >
        <span className="text-gray-400 text-[10px] block leading-none">{formulaLabel()}</span>
        <span className="font-medium">{resolvedValue.toFixed(2)}%</span>
      </span>
    );
  }

  const previewValue = resolveSpec(localSpec, columns);

  return (
    <div className="flex flex-col gap-1 p-1 bg-yellow-50 border border-yellow-400 rounded shadow-md min-w-[200px] z-10 relative">
      {/* Column selector */}
      <div className="flex items-center gap-1 text-xs">
        <label className="text-gray-500 w-8 shrink-0">Col</label>
        <select
          className="border border-gray-300 rounded px-1 py-0.5 text-xs flex-1"
          value={localSpec.col}
          onChange={(e) => setLocalSpec((s) => ({ ...s, col: e.target.value }))}
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} ({c.value.toFixed(2)}%)
            </option>
          ))}
        </select>
      </div>

      {/* Multiplier */}
      <div className="flex items-center gap-1 text-xs">
        <label className="text-gray-500 w-8 shrink-0">× </label>
        <input
          type="number"
          step="0.1"
          className="border border-gray-300 rounded px-1 py-0.5 text-xs w-20"
          value={localSpec.multiplier}
          onChange={(e) =>
            setLocalSpec((s) => ({ ...s, multiplier: parseFloat(e.target.value) || 0 }))
          }
        />
      </div>

      {/* Offset */}
      <div className="flex items-center gap-1 text-xs">
        <label className="text-gray-500 w-8 shrink-0">+ </label>
        <input
          type="number"
          step="0.1"
          className="border border-gray-300 rounded px-1 py-0.5 text-xs w-20"
          value={localSpec.offset}
          onChange={(e) =>
            setLocalSpec((s) => ({ ...s, offset: parseFloat(e.target.value) || 0 }))
          }
        />
      </div>

      {/* Preview */}
      <div className="text-xs text-gray-500 border-t border-yellow-200 pt-1">
        Preview: <span className="font-bold text-gray-800">{previewValue.toFixed(2)}%</span>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <button
          className="flex-1 text-xs bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700"
          onClick={commit}
        >
          Apply
        </button>
        <button
          className="flex-1 text-xs bg-gray-200 text-gray-700 rounded px-2 py-0.5 hover:bg-gray-300"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
