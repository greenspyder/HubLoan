import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { useImpersonation } from "../contexts/ImpersonationContext";

function getBreadcrumb(pathname: string) {
  if (pathname.startsWith("/cliente/ofertas/")) {
    return "Simulação de crédito";
  }

  if (pathname.startsWith("/admin/contratos/")) {
    return "Detalhes da operação";
  }

  if (pathname.startsWith("/cliente")) {
    return "Plataforma do cliente";
  }

  return "Plataforma administrativa";
}

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { impersonatedClientId, clearImpersonation } = useImpersonation();

  return (
    <div className="min-h-screen text-slate-900 lg:grid lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-slate-200/70 bg-white/80 px-5 py-6 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">HubLoan</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Crédito corporativo</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Admin, cliente e simulação em rotas distintas, com contexto operacional sempre visível.</p>
        </div>

        <nav className="mt-8 space-y-2">
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `block rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`
            }
          >
            Plataforma administrativa
          </NavLink>
          {impersonatedClientId !== null ? (
            <NavLink
              to="/cliente"
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-medium transition ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`
              }
            >
              Plataforma do cliente
            </NavLink>
          ) : null}
        </nav>

        <div className="mt-8 rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Impersonação</p>
          {impersonatedClientId !== null ? (
            <>
              <p className="mt-2 text-sm text-slate-700">Cliente ativo #{impersonatedClientId}</p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => {
                  clearImpersonation();
                  navigate("/admin");
                }}
              >
                Desimpersonar
              </Button>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Nenhum cliente selecionado.</p>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="border-b border-slate-200/70 bg-white/80 px-6 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Breadcrumb</p>
              <h2 className="text-lg font-semibold text-slate-900">{getBreadcrumb(location.pathname)}</h2>
            </div>
            {impersonatedClientId !== null ? (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                Navegando como cliente #{impersonatedClientId}
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200/70 bg-white/80 px-6 py-4 text-sm text-slate-500 backdrop-blur">
          Plataforma de crédito simulador.
        </footer>
      </div>
    </div>
  );
}