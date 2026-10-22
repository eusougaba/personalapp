// Resolução do tenant (personal) a partir do host da requisição.
// felipe.dominio.com.br -> "felipe" | felipe.localhost:3000 -> "felipe"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
const RESERVED = new Set(["www", "app", "admin", "api"]);

export function tenantSlugFromHost(host: string | null): string | null {
  if (!host) return null;
  const clean = host.toLowerCase();
  if (clean === ROOT_DOMAIN) return null;
  if (clean.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = clean.slice(0, -(ROOT_DOMAIN.length + 1));
    return RESERVED.has(sub) ? null : sub;
  }
  // Domínio próprio (futuro): resolvido via tabela TenantDomain
  return null;
}

export interface TenantTheme {
  name: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
}

// Converte a marca do personal em variáveis CSS aplicadas no <html>
export function themeToCssVars(t: TenantTheme): Record<string, string> {
  return {
    "--brand-primary": t.primaryColor,
    "--brand-accent": t.accentColor,
  };
}
