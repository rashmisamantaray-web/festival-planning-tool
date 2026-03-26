import { useState } from "react";

interface DateInputs {
  current: string;
  ref1: string;
  ref2: string;
  ref3: string;
}

interface Props {
  onCompute: (currentDate: string, referenceDates: string[]) => void;
  loading: boolean;
}

export default function DateInputPanel({ onCompute, loading }: Props) {
  const [dates, setDates] = useState<DateInputs>({
    current: "",
    ref1: "",
    ref2: "",
    ref3: "",
  });

  const handleChange = (field: keyof DateInputs, value: string) => {
    setDates((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompute = () => {
    if (!dates.current) return;
    const refs = [dates.ref1, dates.ref2, dates.ref3].filter(Boolean);
    if (refs.length === 0) return;
    onCompute(dates.current, refs);
  };

  const isValid = dates.current && [dates.ref1, dates.ref2, dates.ref3].some(Boolean);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-600 mb-1">
          Current Date
        </label>
        <input
          type="date"
          value={dates.current}
          onChange={(e) => handleChange("current", e.target.value)}
          className="border border-blue-400 rounded px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-600 mb-1">
          Reference Date 1
        </label>
        <input
          type="date"
          value={dates.ref1}
          onChange={(e) => handleChange("ref1", e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-600 mb-1">
          Reference Date 2
        </label>
        <input
          type="date"
          value={dates.ref2}
          onChange={(e) => handleChange("ref2", e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs font-semibold text-gray-600 mb-1">
          Reference Date 3
        </label>
        <input
          type="date"
          value={dates.ref3}
          onChange={(e) => handleChange("ref3", e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <button
        onClick={handleCompute}
        disabled={!isValid || loading}
        className="px-5 py-1.5 bg-blue-600 text-white rounded text-sm font-medium
                   hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Computing..." : "Compute"}
      </button>
    </div>
  );
}
