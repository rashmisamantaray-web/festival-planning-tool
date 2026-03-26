import { useState, useEffect, useRef } from "react";

interface Props {
  value: number;
  onChange: (val: number) => void;
  format?: "pct" | "num";
}

export default function EditableCell({ value, onChange, format = "pct" }: Props) {
  const display = format === "pct" ? (value).toFixed(2) + "%" : value.toFixed(2);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(display);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(format === "pct" ? value.toFixed(2) : value.toFixed(2));
  }, [value, format]);

  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const parsed = parseFloat(text.replace("%", ""));
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    }
  };

  if (!editing) {
    return (
      <span
        className="cursor-pointer px-1 py-0.5 rounded bg-yellow-50 border border-yellow-300 inline-block min-w-[60px] text-right"
        onClick={() => setEditing(true)}
        title="Click to edit"
      >
        {display}
      </span>
    );
  }

  return (
    <input
      ref={ref}
      className="editable-cell w-20"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}
