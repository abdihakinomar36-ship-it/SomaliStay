export default function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 40" className={className} role="img" aria-label="SomaliStay">
      {/* Star mark */}
      <g>
        <rect x="1" y="2" width="36" height="36" rx="9" className="fill-brand-green" />
        <path
          d="M19 8l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3-5.6-3.3-5.6 3.3 1.4-6.3-4.8-4.3 6.4-.6z"
          className="fill-white"
        />
      </g>
      {/* Wordmark */}
      <text
        x="46"
        y="18"
        className="fill-slate-900"
        style={{ font: '700 17px "Segoe UI", system-ui, sans-serif' }}
      >
        Somali
      </text>
      <text
        x="107"
        y="18"
        className="fill-brand-green"
        style={{ font: '700 17px "Segoe UI", system-ui, sans-serif' }}
      >
        Stay
      </text>
      <text
        x="46"
        y="31"
        className="fill-slate-500"
        style={{ font: '400 9px "Segoe UI", system-ui, sans-serif' }}
      >
        VERIFIED HOTELS · SOMALIA
      </text>
    </svg>
  );
}
