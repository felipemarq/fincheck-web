import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreditCard,
  PlusCircle,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";

interface QuickActionsProps {
  onNewTransactionClick: () => void;
  onNewAccountClick: () => void;
  onNewRecurringTransactionClick: () => void;
  hasAccounts: boolean;
}

export function QuickActions({
  onNewAccountClick,
  onNewTransactionClick,
  onNewRecurringTransactionClick,
  hasAccounts,
}: QuickActionsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Acoes rapidas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto flex flex-col gap-2 bg-transparent p-4"
          onClick={onNewTransactionClick}
          disabled={!hasAccounts}
        >
          <PlusCircle className="h-5 w-5 text-brand" />
          <span className="text-sm font-medium">Nova transacao</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto flex flex-col gap-2 bg-transparent p-4"
          onClick={onNewAccountClick}
        >
          <CreditCard className="h-5 w-5 text-brand" />
          <span className="text-sm font-medium">Nova conta financeira</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto flex flex-col gap-2 bg-transparent p-4"
          onClick={onNewRecurringTransactionClick}
          disabled={!hasAccounts}
        >
          <PlusCircle className="h-5 w-5 text-brand" />
          <span className="text-sm font-medium">Nova transacao recorrente</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto flex flex-col gap-2 bg-transparent p-4"
          disabled
        >
          <TrendingUp className="h-5 w-5 text-info" />
          <span className="text-sm font-medium">Investir</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto flex flex-col gap-2 bg-transparent p-4"
          disabled
        >
          <Users className="h-5 w-5 text-neutral-600" />
          <span className="text-sm font-medium">Contatos</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto flex flex-col gap-2 bg-transparent p-4"
          disabled
        >
          <Settings className="h-5 w-5 text-neutral-600" />
          <span className="text-sm font-medium">Configurar</span>
        </Button>
      </CardContent>

      {!hasAccounts && (
        <div className="px-6 pb-6 text-sm text-muted-foreground">
          Crie uma conta financeira para liberar transacoes e recorrencias da entidade ativa.
        </div>
      )}
    </Card>
  );
}
