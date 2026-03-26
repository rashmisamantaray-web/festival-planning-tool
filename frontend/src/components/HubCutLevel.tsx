import type { HubCutLevelData, HubCutRecord } from "../types/festival";
import { MAJOR_CITIES } from "../constants";

function pct(v: number) {
  return v.toFixed(2) + "%";
}

interface Props {
  data: HubCutLevelData;
  showMinorCities: boolean;
  onToggleMinorCities: () => void;
  minorLoading: boolean;
}

const TOTAL_COLS = 10;

export default function HubCutLevel({
  data,
  showMinorCities,
  onToggleMinorCities,
  minorLoading,
}: Props) {
  const majorRecords = data.data.filter((r) => MAJOR_CITIES.has(r.city_name));
  const minorRecords = data.data.filter((r) => !MAJOR_CITIES.has(r.city_name));

  const renderRow = (rec: HubCutRecord, i: number) => (
    <tr key={i}>
      <td className="font-medium">{rec.city_name}</td>
      <td>{rec.hub_name}</td>
      <td>{rec.sub_category}</td>
      <td>{rec.cut_class}</td>
      <td className="text-right">{rec.baseline.toFixed(2)}</td>
      <td className="text-right">{pct(rec.hub_drop_pct)}</td>
      <td className="text-right">{pct(rec.drop_with_current_pct)}</td>
      <td className="text-right">{pct(rec.target_subcat_cut_drop_pct)}</td>
      <td className="text-right font-bold">{pct(rec.final_after_indexing_pct)}</td>
      <td className="text-right">{rec.final_rev.toFixed(2)}</td>
    </tr>
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold">
          Level 5 — City-Hub-SubCat-CutClass (Derived)
        </h2>
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
            <th>City</th>
            <th>Hub</th>
            <th>Sub Category</th>
            <th>Cut Class</th>
            <th>Baseline</th>
            <th>Hub Drop %</th>
            <th>Drop w/ Current</th>
            <th>Target SubCat-Cut %</th>
            <th>After Indexing %</th>
            <th>Final Rev</th>
          </tr>
        </thead>
        <tbody>
          {/* Major cities */}
          <tr>
            <td
              colSpan={TOTAL_COLS}
              className="bg-blue-50 text-blue-800 font-semibold text-xs px-2 py-1"
            >
              Major Cities
            </td>
          </tr>
          {majorRecords.map((rec, i) => renderRow(rec, i))}

          {/* Minor cities */}
          {showMinorCities && minorRecords.length > 0 && (
            <>
              <tr>
                <td
                  colSpan={TOTAL_COLS}
                  className="bg-gray-50 text-gray-600 font-semibold text-xs px-2 py-1"
                >
                  Minor Cities
                </td>
              </tr>
              {minorRecords.map((rec, i) => renderRow(rec, majorRecords.length + i))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
