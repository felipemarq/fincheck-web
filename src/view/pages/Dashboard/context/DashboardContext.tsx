import { createContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboard } from "@/app/hooks/useDashboard";
import type { DashboardResponse } from "@/app/services/dashboardService/get";
import { useAuth } from "@/app/hooks/useAuth";
import { useAccounts } from "@/app/hooks/useAccounts";

interface DashboardContextValue {
  dashboard: DashboardResponse | undefined;
  isFetchingDashboard: boolean;

  // Modals de nova conta
  isNewAccountModalOpen: boolean;
  openNewAccountModal: () => void;
  closeNewAccountModal: () => void;

  // Modals de nova transação
  isNewTransactionModalOpen: boolean;
  openNewTransactionModal: () => void;
  closeNewTransactionModal: () => void;
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

  const { isFetchingAccounts, accounts } = useAccounts({
    entityId: selectedEntityId!,
  });

  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] =
    useState(false);

  const openNewTransactionModal = () => {
    setIsNewTransactionModalOpen(true);
  };

  const closeNewTransactionModal = () => {
    setIsNewTransactionModalOpen(false);
  };

  console.log(isNewAccountModalOpen);

  const openNewAccountModal = () => {
    setIsNewAccountModalOpen(true);
  };

  const closeNewAccountModal = () => {
    setIsNewAccountModalOpen(false);
  };

  console.log("accounts", accounts);

  const queryClient = useQueryClient();

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
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
