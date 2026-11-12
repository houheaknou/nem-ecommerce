import { cn } from "@/lib/utils";

/**
 * Hand-drawn style illustration of nem wrapped in banana leaf with chilli and
 * garlic — used where a real product photo has not been uploaded yet.
 * Replace with real photography via product_images.
 */
export function NemIllustration({ className, variant = 0 }: { className?: string; variant?: number }) {
  const leaf = ["#7fbf7a", "#8cc97f", "#74b56f", "#93cf88"][variant % 4];
  return (
    <svg viewBox="0 0 200 160" className={cn("h-full w-full", className)} role="img" aria-label="Nem Battambang">
      <ellipse cx="100" cy="138" rx="74" ry="10" fill="currentColor" opacity="0.08" />
      {/* banana leaf */}
      <path d="M22 108 C 40 60, 150 40, 182 72 C 168 118, 70 138, 22 108 Z" fill={leaf} />
      <path d="M30 104 C 80 90, 130 74, 176 74" stroke="#5b9c58" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* nem parcels */}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${52 + i * 34} ${86 - i * 6}) rotate(${-12 + i * 4})`}>
          <rect x="-18" y="-14" width="36" height="30" rx="9" fill="#ff9aa4" />
          <rect x="-18" y="-14" width="36" height="30" rx="9" fill="url(#nemDots)" />
          <rect x="-4" y="-16" width="8" height="34" rx="3" fill="#cfe8c4" />
          <circle cx="-8" cy="-2" r="2.4" fill="#ffffff" opacity="0.85" />
          <circle cx="8" cy="6" r="2" fill="#ffffff" opacity="0.85" />
        </g>
      ))}
      {/* chilli */}
      <path d="M150 104 q 18 -2 22 14 q -16 0 -22 -14 Z" fill="#e5484d" />
      <path d="M150 104 l -5 -5" stroke="#4f8a4c" strokeWidth="3" strokeLinecap="round" />
      {/* garlic */}
      <circle cx="44" cy="122" r="8" fill="#fff4e0" stroke="#f1e4dc" strokeWidth="2" />
      <path d="M44 114 v -5" stroke="#c9b79c" strokeWidth="2" strokeLinecap="round" />
      {/* cute face on the middle parcel */}
      <g transform="translate(86 80)">
        <circle cx="-5" cy="2" r="1.6" fill="#49352f" />
        <circle cx="5" cy="2" r="1.6" fill="#49352f" />
        <path d="M-3 6 q 3 3 6 0" stroke="#49352f" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <circle cx="-9" cy="6" r="2" fill="#ff6f7d" opacity="0.6" />
        <circle cx="9" cy="6" r="2" fill="#ff6f7d" opacity="0.6" />
      </g>
      <defs>
        <pattern id="nemDots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.9" fill="#ffffff" opacity="0.5" />
        </pattern>
      </defs>
    </svg>
  );
}

export function Logo({ className, title, sub }: { className?: string; title: string; sub: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="grid size-10 place-items-center rounded-2xl bg-accent shadow-soft">
        <NemIllustration className="size-9" />
      </span>
      <span className="leading-tight">
        <span className="block font-heading text-base font-extrabold text-primary">{title}</span>
        <span className="block text-[11px] text-muted-foreground">{sub}</span>
      </span>
    </span>
  );
}
