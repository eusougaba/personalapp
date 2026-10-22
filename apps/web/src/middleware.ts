import { NextResponse, type NextRequest } from "next/server";
import { tenantSlugFromHost } from "./lib/tenant";

// felipe.dominio.com.br/treinos -> /t/felipe/treinos (app do aluno com a marca do personal).
// Rotas globais (painel, login, convite, API) continuam funcionando em qualquer host.
const GLOBAL = /^\/(t|painel|entrar|cadastro|convite|api|_next)(\/|$)/;

export function middleware(req: NextRequest) {
  const slug = tenantSlugFromHost(req.headers.get("host"));
  const { pathname } = req.nextUrl;
  if (!slug || GLOBAL.test(pathname)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = `/t/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
