import { createContext, useState } from "react";
import { useDashboard } from "@/app/hooks/useDashboard";
import type { DashboardResponse } from "@/app/services/dashboardService/get";
import { useAuth } from "@/app/hooks/useAuth";

interface DashboardContextValue {
  dashboard: DashboardResponse | undefined;
  isFetchingDashboard: boolean;
  selectedEntityId: string | null;

  // Modals de nova conta
  isNewAccountModalOpen: boolean;
  openNewAccountModal: () => void;
  closeNewAccountModal: () => void;

  // Modals de nova transação
  isNewTransactionModalOpen: boolean;
  openNewTransactionModal: () => void;
  closeNewTransactionModal: () => void;

  // Modals de nova transação recorrence
  isNewRecurringTransactionModalOpen: boolean;
  openNewRecurringTransactionModal: () => void;
  closeNewRecurringTransactionModal: () => void;
}

export const DashboardContext = createContext({} as DashboardContextValue);

export const DashboardContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { selectedEntityId } = useAuth();
  const { dashboard, isFetchingDashboard } = useDashboard({
    entityId: selectedEntityId!,
  });

  /* const { isFetchingAccounts, accounts } = useAccounts({
    entityId: selectedEntityId!,
  }); */

  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] =
    useState(false);

  const [
    isNewRecurringTransactionModalOpen,
    setIsNewRecurringTransactionModalOpen,
  ] = useState(false);

  const openNewRecurringTransactionModal = () => {
    setIsNewRecurringTransactionModalOpen(true);
  };

  const closeNewRecurringTransactionModal = () => {
    setIsNewRecurringTransactionModalOpen(false);
  };

  const openNewTransactionModal = () => {
    setIsNewTransactionModalOpen(true);
  };

  const closeNewTransactionModal = () => {
    setIsNewTransactionModalOpen(false);
  };

  const openNewAccountModal = () => {
    setIsNewAccountModalOpen(true);
  };

  const closeNewAccountModal = () => {
    setIsNewAccountModalOpen(false);
  };

  //const queryClient = useQueryClient();

  return (
    <DashboardContext.Provider
      value={{
        dashboard,
        isFetchingDashboard,
        closeNewAccountModal,
        isNewAccountModalOpen,
        openNewAccountModal,
        closeNewTransactionModal,
        isNewTransactionModalOpen,
        openNewTransactionModal,
        selectedEntityId,
        closeNewRecurringTransactionModal,
        isNewRecurringTransactionModalOpen,
        openNewRecurringTransactionModal,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
