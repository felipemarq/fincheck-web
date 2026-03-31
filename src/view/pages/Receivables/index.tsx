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

export default function Receivables() {
  const { selectedEntityId } = useAuth();
  const { dashboard } = useDashboard(
    {
      entityId: selectedEntityId!,
      sections: ["settlements"],
    },
    Boolean(selectedEntityId)
  );

  const receivables = dashboard?.settlements?.receivables;

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Contas a receber</h1>
        <p className="text-muted-foreground text-sm">
          Visualize receitas em aberto, atrasos de recebimento e o que entra nos
          proximos dias.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total em aberto</CardDescription>
            <CardTitle>{formatMoney(receivables?.openTotal ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {receivables?.openCount ?? 0} contas aguardando recebimento.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Vencidas</CardDescription>
            <CardTitle>{formatMoney(receivables?.overdueTotal ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {receivables?.overdueCount ?? 0} contas atrasadas ate hoje.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Proximos recebimentos</CardDescription>
            <CardTitle>{formatMoney(receivables?.upcomingTotal ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {receivables?.dueTodayCount ?? 0} para hoje e{" "}
            {receivables?.upcomingCount ?? 0} nos proximos{" "}
            {dashboard?.settlements?.horizonDays ?? 7} dias.
          </CardContent>
        </Card>
      </div>

      {selectedEntityId && (
        <TransactionsTable
          entityId={selectedEntityId}
          initialTypes={[Transaction.Type.INCOME]}
          initialIsPaid="false"
          initialSortBy="dueDate"
        />
      )}
    </div>
  );
}
