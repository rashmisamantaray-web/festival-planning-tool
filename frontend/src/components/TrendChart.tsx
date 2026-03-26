import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import type { TrendData } from "../types/festival";

interface Props {
  trendData: TrendData;
  cities: string[];
}

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed"];

export default function TrendChart({ trendData, cities }: Props) {
  const [selectedCity, setSelectedCity] = useState<string>(
    cities[0] ?? ""
  );

  const refDates = Object.keys(trendData.trends);

  const { chartData, avgStdPct } = useMemo(() => {
    const points: Record<number, Record<string, number | string | null>> = {};
    let stdSum = 0;
    let stdCount = 0;

    for (let offset = -5; offset <= 5; offset++) {
      points[offset] = { day_offset: offset, label: `D${offset >= 0 ? "+" : ""}${offset}` };
    }

    refDates.forEach((refDate) => {
      const cityData = trendData.trends[refDate]?.[selectedCity] ?? [];
      cityData.forEach((pt) => {
        if (points[pt.day_offset]) {
          points[pt.day_offset][refDate] = pt.pct_change;
          if (pt.std_pct != null && !Number.isNaN(pt.std_pct)) {
            stdSum += pt.std_pct;
            stdCount += 1;
          }
        }
      });
    });

    const avgStd = stdCount > 0 ? stdSum / stdCount : 0;
    return {
      chartData: Object.values(points).sort(
        (a, b) => (a.day_offset as number) - (b.day_offset as number)
      ),
      avgStdPct: avgStd,
    };
  }, [trendData, selectedCity, refDates]);

  if (refDates.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-white rounded border border-gray-300 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">
          % Change from Baseline (D-5 to D+5)
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">City:</label>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
          >
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        Y-axis: % change from baseline. Gray band: ±1 std (typical variance). Drops outside band are more meaningful.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip formatter={(v: number, name: string) => [v != null ? `${Number(v).toFixed(2)}%` : "", name]} />
          <Legend />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
          <ReferenceArea
            y1={-avgStdPct}
            y2={avgStdPct}
            fill="#e2e8f0"
            fillOpacity={0.4}
          />
          <ReferenceLine
            y={avgStdPct}
            stroke="#94a3b8"
            strokeDasharray="1 1"
            strokeWidth={1}
          />
          <ReferenceLine
            y={-avgStdPct}
            stroke="#94a3b8"
            strokeDasharray="1 1"
            strokeWidth={1}
          />
          {refDates.map((refDate, i) => (
            <Line
              key={refDate}
              type="monotone"
              dataKey={refDate}
              name={refDate}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
