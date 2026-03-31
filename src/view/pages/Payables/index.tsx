import { Transaction } from "@/app/entities/Transaction";
import { useAuth } from "@/app/hooks/useAuth";
import { useDashboard } from "@/app/hooks/useDashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TransactionsTable } from "@/view/components/TransactionTable";

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Payables() {
  const { selectedEntityId } = useAuth();
  const { dashboard } = useDashboard(
    {
      entityId: selectedEntityId!,
      sections: ["settlements"],
    },
    Boolean(selectedEntityId)
  );

  const payables = dashboard?.settlements?.payables;

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Contas a pagar</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe despesas em aberto, vencidas e os proximos compromissos da
          entidade ativa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total em aberto</CardDescription>
            <CardTitle>{formatMoney(payables?.openTotal ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {payables?.openCount ?? 0} contas aguardando pagamento.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Vencidas</CardDescription>
            <CardTitle>{formatMoney(payables?.overdueTotal ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {payables?.overdueCount ?? 0} contas vencidas ate hoje.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Proximos vencimentos</CardDescription>
            <CardTitle>{formatMoney(payables?.upcomingTotal ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {payables?.dueTodayCount ?? 0} para hoje e{" "}
            {payables?.upcomingCount ?? 0} nos proximos{" "}
            {dashboard?.settlements?.horizonDays ?? 7} dias.
          </CardContent>
        </Card>
      </div>

      {selectedEntityId && (
        <TransactionsTable
          entityId={selectedEntityId}
          initialTypes={[Transaction.Type.EXPENSE]}
          initialIsPaid="false"
          initialSortBy="dueDate"
        />
      )}
    </div>
  );
}
