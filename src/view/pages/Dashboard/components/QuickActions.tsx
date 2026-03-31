import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PlusCircle,
  CreditCard,
  TrendingUp,
  Users,
  Settings,
} from "lucide-react";

interface QuickActionsProps {
  onNewTransactionClick: () => void;
  onNewAccountClick: () => void;
  onNewRecurringTransactionClick: () => void;
}

export function QuickActions({
  onNewAccountClick,
  onNewTransactionClick,
  onNewRecurringTransactionClick,
}: QuickActionsProps) {
  return (
    <Card className=" h-full">
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col gap-2 bg-transparent"
          onClick={onNewTransactionClick}
        >
          <PlusCircle className="h-5 w-5 text-brand" />
          <span className="text-sm font-medium">Nova Transação</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col gap-2 bg-transparent"
          onClick={onNewAccountClick}
        >
          <CreditCard className="h-5 w-5 text-brand" />
          <span className="text-sm font-medium">Nova conta financeira</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col gap-2 bg-transparent"
          onClick={onNewRecurringTransactionClick}
        >
          <PlusCircle className="h-5 w-5 text-brand" />
          <span className="text-sm font-medium">Nova Transação Recorrente</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col gap-2 bg-transparent"
          disabled
        >
          <TrendingUp className="h-5 w-5 text-info" />
          <span className="text-sm font-medium">Investir</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col gap-2 bg-transparent"
          disabled
        >
          <Users className="h-5 w-5 text-neutral-600" />
          <span className="text-sm font-medium">Contatos (em breve)</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col gap-2 bg-transparent"
          disabled
        >
          <Settings className="h-5 w-5 text-neutral-600" />
          <span className="text-sm font-medium">Configurar</span>
        </Button>
      </CardContent>
    </Card>
  );
}
