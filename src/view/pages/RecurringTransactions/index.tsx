import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { RecurringTransactionsTable } from "@/view/components/RecurringTransactionsTable";
import { RecurringTransactionModal } from "@/view/modals/RecurringTransactionModal";
import { useAuth } from "@/app/hooks/useAuth";

export default function RecurringTransactions() {
  const { selectedEntityId } = useAuth();
  const [isNewRecurringOpen, setIsNewRecurringOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transações recorrentes</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie regras recorrentes, edite valores e desative quando
            necessário.
          </p>
        </div>
        <Button
          className="w-full md:w-auto"
          onClick={() => setIsNewRecurringOpen(true)}
        >
          <IconPlus className="mr-2 size-4" />
          Nova recorrência
        </Button>
      </div>

      <RecurringTransactionsTable entityId={selectedEntityId!} />

      <RecurringTransactionModal
        isOpen={isNewRecurringOpen}
        onClose={() => setIsNewRecurringOpen(false)}
        action="create"
      />
    </div>
  );
}
