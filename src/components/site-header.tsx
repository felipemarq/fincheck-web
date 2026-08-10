import { useLocation } from "react-router-dom";

import { useAuth } from "@/app/hooks/useAuth";
import { Separator } from "@/view/components/ui/separator";
import { SidebarTrigger } from "@/view/components/ui/sidebar";

const routeMeta = [
  {
    matcher: (pathname: string) => pathname === "/dashboard",
    title: "Painel operacional",
    description: "Pendencias, prazos e resultados da organizacao ativa.",
  },
  {
    matcher: (pathname: string) => pathname === "/quotations",
    title: "Cotacoes",
    description: "Propostas comerciais enviadas aos clientes.",
  },
  {
    matcher: (pathname: string) => pathname === "/quotations/new",
    title: "Nova cotacao",
    description: "Produtos, precos, condicoes e imagens da proposta.",
  },
  {
    matcher: (pathname: string) => pathname.startsWith("/quotations/"),
    title: "Detalhe da cotacao",
    description: "Revisao comercial e exportacao da proposta em PDF.",
  },
  {
    matcher: (pathname: string) => pathname === "/orders",
    title: "Ordens de compra",
    description: "Compromissos comerciais da organizacao ativa.",
  },
  {
    matcher: (pathname: string) => pathname === "/orders/new",
    title: "Nova ordem",
    description: "Cadastro manual do documento e seus itens.",
  },
  {
    matcher: (pathname: string) => pathname === "/items",
    title: "Itens operacionais",
    description: "Fila unificada de compras e recebimentos das ordens ativas.",
  },
  {
    matcher: (pathname: string) => pathname.endsWith("/edit"),
    title: "Editar ordem",
    description: "Atualize o documento e preserve seu historico comercial.",
  },
  {
    matcher: (pathname: string) => pathname.startsWith("/orders/"),
    title: "Detalhe da ordem",
    description: "Centro operacional da ordem de compra.",
  },
  {
    matcher: (pathname: string) => pathname === "/customers",
    title: "Clientes",
    description: "Unidades compradoras e dados de entrega.",
  },
  {
    matcher: (pathname: string) => pathname === "/products",
    title: "Produtos",
    description: "Catalogo e referencias para compras e vendas.",
  },
  {
    matcher: (pathname: string) => pathname === "/pricing",
    title: "Precificacao",
    description: "Calculo rapido de precos para cotacoes.",
  },
  {
    matcher: (pathname: string) => pathname === "/finance",
    title: "Financeiro",
    description: "Contas a pagar, recebimentos e cartoes da operacao ativa.",
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
              <span className="text-muted-foreground">Operacao ativa</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
