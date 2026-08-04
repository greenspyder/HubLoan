import { useEffect, useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { getOperationalDate, setOperationalDate } from "../../services/creditService";
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
  const [showConfig, setShowConfig] = useState(false);
  const [operationalDateInput, setOperationalDateInput] = useState("");
  const [operationalDateLabel, setOperationalDateLabel] = useState("-");
  const [savingOperationalDate, setSavingOperationalDate] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  const loadOperationalDate = async () => {
    const current = await getOperationalDate();
    setOperationalDateInput(current.usandoDataCustomizada ? current.dataAtual.slice(0, 10) : "");
    const formattedDate = new Date(current.dataAtual).toLocaleDateString("pt-BR");
    setOperationalDateLabel(`${formattedDate} ${current.usandoDataCustomizada ? "(customizada)" : "(relógio do sistema)"}`);
  };

  useEffect(() => {
    void loadOperationalDate().catch(() => {
      setOperationalDateLabel("Indisponível");
    });
  }, []);

  const handleApplyOperationalDate = async () => {
    if (!operationalDateInput) {
      setConfigMessage("Informe uma data válida.");
      return;
    }

    setSavingOperationalDate(true);
    setConfigMessage("");

    try {
      await setOperationalDate(operationalDateInput);
      await loadOperationalDate();
      setConfigMessage("Data operacional atualizada.");
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : "Falha ao atualizar data operacional.");
    } finally {
      setSavingOperationalDate(false);
    }
  };

  const handleResetOperationalDate = async () => {
    setSavingOperationalDate(true);
    setConfigMessage("");

    try {
      await setOperationalDate(null);
      await loadOperationalDate();
      setConfigMessage("Data operacional voltou para o relógio do sistema.");
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : "Falha ao limpar data operacional.");
    } finally {
      setSavingOperationalDate(false);
    }
  };

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

      <div className="fixed bottom-5 right-5 z-40">
        <Button onClick={() => setShowConfig((current) => !current)}>
          Configurações
        </Button>

        {showConfig ? (
          <div className="mt-3 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_44px_-26px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-semibold text-slate-900">Menu rápido</p>
            <p className="mt-1 text-xs text-slate-500">Troca de contexto e ajustes operacionais.</p>

            <div className="mt-4 grid gap-2">
              <Button variant="outline" onClick={() => navigate("/admin")}>Ir para administrativo</Button>
              {impersonatedClientId !== null ? <Button variant="outline" onClick={() => navigate("/cliente")}>Ir para cliente</Button> : null}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Impersonação</p>
              {impersonatedClientId !== null ? (
                <>
                  <p className="mt-2 text-sm text-slate-700">Cliente ativo #{impersonatedClientId}</p>
                  <Button
                    variant="outline"
                    className="mt-3 w-full"
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

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Data operacional</p>
              <p className="mt-2 text-xs text-slate-600">Em uso: {operationalDateLabel}</p>
              <Input className="mt-3" type="date" value={operationalDateInput} onChange={(event) => setOperationalDateInput(event.target.value)} />
              <div className="mt-3 grid gap-2">
                <Button onClick={() => void handleApplyOperationalDate()} disabled={savingOperationalDate}>Aplicar data</Button>
                <Button variant="outline" onClick={() => void handleResetOperationalDate()} disabled={savingOperationalDate}>Usar relógio real</Button>
              </div>
            </div>

            {configMessage ? <p className="mt-3 text-xs text-slate-600">{configMessage}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}