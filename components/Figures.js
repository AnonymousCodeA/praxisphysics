// Line drawings for the category cards, keyed by category slug.
const common = {
  viewBox: '0 0 120 74',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  'aria-hidden': true,
};

export function Figure({ slug }) {
  switch (slug) {
    case 'mechanics':
      return (
        <svg {...common}>
          <line x1="20" y1="10" x2="100" y2="10" />
          <line x1="60" y1="10" x2="86" y2="54" />
          <circle cx="86" cy="54" r="7" fill="currentColor" fillOpacity=".2" />
          <path d="M60 40 A30 30 0 0 0 86 47" strokeDasharray="3 4" opacity=".55" />
        </svg>
      );
    case 'thermodynamics':
      return (
        <svg {...common}>
          <rect x="16" y="12" width="88" height="50" />
          <circle cx="38" cy="28" r="2.6" fill="currentColor" />
          <circle cx="68" cy="45" r="2.6" fill="currentColor" />
          <circle cx="86" cy="24" r="2.6" fill="currentColor" />
          <circle cx="48" cy="52" r="2.6" fill="currentColor" />
          <path d="M38 28 l12 -7 M68 45 l-11 6 M86 24 l-9 11 M48 52 l10 5" opacity=".65" />
        </svg>
      );
    case 'electromagnetism':
      return (
        <svg {...common}>
          <circle cx="60" cy="37" r="6" fill="currentColor" fillOpacity=".25" />
          <path
            d="M60 27 V9 M60 47 V65 M50 37 H30 M70 37 H90 M53 30 L41 18 M67 30 L79 18 M53 44 L41 56 M67 44 L79 56"
            opacity=".8"
          />
        </svg>
      );
    case 'waves-optics':
      return (
        <svg {...common}>
          <line x1="46" y1="10" x2="46" y2="64" />
          <path d="M8 22 H38 M8 37 H38 M8 52 H38" opacity=".55" />
          <path d="M46 37 L112 37 M46 37 L106 14 M46 37 L106 60" />
          <path d="M46 37 L96 6" opacity=".45" />
          <path d="M46 37 L96 68" opacity=".45" />
        </svg>
      );
    case 'modern-physics':
      return (
        <svg {...common}>
          <circle cx="60" cy="37" r="6" fill="currentColor" fillOpacity=".3" />
          <ellipse cx="60" cy="37" rx="40" ry="15" />
          <ellipse cx="60" cy="37" rx="40" ry="15" transform="rotate(60 60 37)" />
          <ellipse cx="60" cy="37" rx="40" ry="15" transform="rotate(-60 60 37)" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="28" cy="24" r="11" />
          <path d="M74 10 L96 10 L85 30 Z" />
          <path d="M14 56 Q26 40 38 56 T62 56" />
          <path d="M72 46 H104 M72 56 H96 M72 66 H104" opacity=".7" />
        </svg>
      );
  }
}
