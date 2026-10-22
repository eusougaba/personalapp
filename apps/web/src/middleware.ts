import { NextResponse, type NextRequest } from "next/server";
import { tenantSlugFromHost } from "./lib/tenant";

// Reescreve felipe.dominio.com.br/qualquer-rota -> /t/felipe/qualquer-rota
// A rota /t/[tenant] carrega a marca e restringe os dados àquele personal.
export function middleware(req: NextRequest) {
  const slug = tenantSlugFromHost(req.headers.get("host"));
  if (!slug) return NextResponse.next(); // site institucional / admin

  const url = req.nextUrl.clone();
  url.pathname = `/t/${slug}${url.pathname}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("x-tenant-slug", slug);
  return res;
}

export const config = {
  matcher: ["/((?!_next|api/webhooks|favicon.ico|.*\\..*).*)"],
};
