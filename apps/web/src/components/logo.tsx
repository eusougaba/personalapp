// Marca da plataforma (Coachy). O aluno vê a marca do personal; esta aparece para o personal e no "feito com".
export const PRODUCT_NAME = "Coachy";
export const PRODUCT_DOMAIN = "coachy.com.br";

export function Logo({ light = false, size = 26 }: { light?: boolean; size?: number }) {
  return (
    <span
      className={`font-display inline-flex items-baseline uppercase leading-none tracking-[0.02em] ${light ? "text-[#F4F7E8]" : "text-[#0E0F0C]"}`}
      style={{ fontSize: size }}
      aria-label={PRODUCT_NAME}
    >
      COACHY<span className="text-volt-dark" style={{ color: light ? "var(--volt)" : undefined }}>.</span>
    </span>
  );
}

export function PoweredBy({ className = "" }: { className?: string }) {
  return (
    <a href={`https://${PRODUCT_DOMAIN}`} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-600 ${className}`}>
      feito com <span className="font-display text-[12px] tracking-[0.04em] text-zinc-600">COACHY</span>
    </a>
  );
}
