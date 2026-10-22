export const PRODUCT_NAME = "PersonalApp";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-semibold tracking-tight ${light ? "text-white" : "text-zinc-900"}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6.5 6.5 17.5 17.5M4 10l6-6M14 20l6-6" />
        </svg>
      </span>
      {PRODUCT_NAME}
    </span>
  );
}
