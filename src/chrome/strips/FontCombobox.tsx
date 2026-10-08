import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { filterFonts, fontList, BUNDLED_FONTS } from "../../lib/fonts";

interface Props {
  value: string | undefined;
  recent: string[];
  onChange(font: string): void;
  /** Injected for tests; defaults to the backend list. */
  loadFonts?: () => Promise<string[]>;
}

interface Row {
  font: string;
  group: "Recent" | "All";
}

/** Searchable font picker: Recent then All, each row in its own family (board 1o). */
export function FontCombobox({ value, recent, onChange, loadFonts = fontList }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fonts, setFonts] = useState<string[]>(BUNDLED_FONTS);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    loadFonts().then((f) => live && setFonts(f));
    return () => {
      live = false;
    };
  }, [loadFonts]);

  const rows: Row[] = useMemo(() => {
    const all = filterFonts(fonts, query);
    const rec = filterFonts(
      recent.filter((f) => fonts.includes(f) || BUNDLED_FONTS.includes(f)),
      query,
    );
    return [
      ...rec.map((font) => ({ font, group: "Recent" as const })),
      ...all.map((font) => ({ font, group: "All" as const })),
    ];
  }, [fonts, recent, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    root.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const choose = (font: string) => {
    onChange(font);
    setOpen(false);
    setQuery("");
  };
  const openList = () => {
    setOpen(true);
    setActive(0);
    setTimeout(() => input.current?.focus());
  };

  return (
    <div className="font-combo" ref={root}>
      <button
        className="font-combo-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Font"
        style={{ fontFamily: `"${value}"` }}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <span>{value}</span>
        <CaretDown size={12} />
      </button>
      {open && (
        <div className="font-combo-pop">
          <input
            ref={input}
            className="font-combo-search"
            placeholder="Search fonts"
            aria-label="Search fonts"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(rows.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (rows[active]) choose(rows[active].font);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
              }
            }}
          />
          <div className="font-combo-list" role="listbox" aria-label="Fonts">
            {rows.map((r, i) => (
              <div key={`${r.group}-${r.font}`}>
                {(i === 0 || rows[i - 1].group !== r.group) && (
                  <div className="font-combo-group">{r.group}</div>
                )}
                <div
                  role="option"
                  data-index={i}
                  aria-selected={i === active}
                  className={[
                    "font-combo-row",
                    i === active && "active",
                    r.font === value && "current",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ fontFamily: `"${r.font}"` }}
                  onPointerEnter={() => setActive(i)}
                  onClick={() => choose(r.font)}
                >
                  {r.font}
                </div>
              </div>
            ))}
            {!rows.length && <div className="font-combo-empty">No fonts match</div>}
          </div>
        </div>
      )}
    </div>
  );
}
