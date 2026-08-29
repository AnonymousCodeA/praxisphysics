export default function InstrumentMenu({ items, open, onToggle }) {
  return (
    <div className="instrument-menu">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          className={open[it.key] ? 'active' : ''}
          aria-pressed={!!open[it.key]}
          onClick={() => onToggle(it.key)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
