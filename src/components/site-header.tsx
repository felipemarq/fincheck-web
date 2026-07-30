import { useLocation } from "react-router-dom";

import { useAuth } from "@/app/hooks/useAuth";
import { Separator } from "@/view/components/ui/separator";
import { SidebarTrigger } from "@/view/components/ui/sidebar";

const ENTITY_TYPE_LABELS = {
  PF: "Pessoa fisica",
  PJ: "Pessoa juridica",
} as const;

const routeMeta = [
  {
    matcher: (pathname: string) => pathname === "/",
    title: "Dashboard",
    description: "Visao geral da entidade ativa.",
  },
  {
    matcher: (pathname: string) => pathname === "/entities",
    title: "Entidades",
    description: "Gestao de estruturas PF e PJ.",
  },
  {
    matcher: (pathname: string) => pathname === "/accounts",
    title: "Contas",
    description: "Contas operacionais da entidade ativa.",
  },
  {
    matcher: (pathname: string) => pathname === "/payables",
    title: "Contas a pagar",
    description: "Compromissos em aberto da entidade ativa.",
  },
  {
    matcher: (pathname: string) => pathname === "/receivables",
    title: "Contas a receber",
    description: "Recebimentos em aberto da entidade ativa.",
  },
  {
    matcher: (pathname: string) => pathname === "/credit-cards",
    title: "Cartoes",
    description: "Cartoes vinculados a esta entidade.",
  },
  {
    matcher: (pathname: string) => pathname === "/contacts",
    title: "Contatos",
    description: "Clientes, fornecedores e pessoas vinculadas.",
  },
  {
    matcher: (pathname: string) => pathname === "/taxes",
    title: "Impostos",
    description: "Configuracao tributaria por entidade.",
  },
  {
    matcher: (pathname: string) => pathname === "/recurring-transactions",
    title: "Recorrencias",
    description: "Lancamentos recorrentes da entidade ativa.",
  },
];

export function SiteHeader() {
  const location = useLocation();
  const { activeEntity } = useAuth();

  const meta =
    routeMeta.find(({ matcher }) => matcher(location.pathname)) ?? routeMeta[0];

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{meta.title}</h1>
          <p className="hidden truncate text-xs text-muted-foreground md:block">
            {meta.description}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {activeEntity && (
            <div className="hidden items-center gap-2 rounded-full border px-3 py-1 text-xs md:flex">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: activeEntity.color }}
              />
              <span className="font-medium">{activeEntity.name}</span>
              <span className="text-muted-foreground">
                {ENTITY_TYPE_LABELS[activeEntity.type]}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
