import { createContext, useEffect, useMemo, useState } from "react";

import { useAccounts } from "@/app/hooks/useAccounts";
import { useAuth } from "@/app/hooks/useAuth";
import { useDashboard } from "@/app/hooks/useDashboard";
import { useTransactions } from "@/app/hooks/useTransactions";
import type { DashboardResponse } from "@/app/services/dashboardService/get";
import type { EntityOnboarding } from "@/app/services/authStorage";

interface DashboardContextValue {
  dashboard: DashboardResponse | undefined;
  isFetchingDashboard: boolean;
  selectedEntityId: string | null;
  hasAccounts: boolean;
  hasTransactions: boolean;
  isAccountCreationRequired: boolean;
  isFirstTransactionRecommended: boolean;
  activeOnboardingStep: EntityOnboarding["step"] | null;

  isNewAccountModalOpen: boolean;
  openNewAccountModal: () => void;
  closeNewAccountModal: () => void;

  isNewTransactionModalOpen: boolean;
  openNewTransactionModal: () => void;
  closeNewTransactionModal: () => void;

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
  const {
    selectedEntityId,
    entityOnboarding,
    clearEntityOnboarding,
  } = useAuth();
  const { dashboard, isFetchingDashboard } = useDashboard({
    entityId: selectedEntityId!,
  });

  const { isFetchingAccounts, accounts } = useAccounts(
    {
      entityId: selectedEntityId!,
    },
    Boolean(selectedEntityId)
  );

  const { transactions, isFetchingTransactions } = useTransactions(
    {
      entityId: selectedEntityId!,
      page: 1,
      pageSize: 1,
      sortBy: "createdAt",
      sortDir: "desc",
    },
    Boolean(selectedEntityId) && !isFetchingAccounts && (accounts?.length ?? 0) > 0
  );

  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] =
    useState(false);
  const [
    isNewRecurringTransactionModalOpen,
    setIsNewRecurringTransactionModalOpen,
  ] = useState(false);
  const [hasAutoOpenedFirstTransactionModal, setHasAutoOpenedFirstTransactionModal] =
    useState(false);

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

  const hasAccounts = useMemo(
    () => (accounts?.length ?? 0) > 0,
    [accounts]
  );

  const isAccountCreationRequired = useMemo(
    () => !isFetchingAccounts && !hasAccounts,
    [hasAccounts, isFetchingAccounts]
  );

  const hasTransactions = useMemo(
    () => (transactions?.total ?? 0) > 0,
    [transactions?.total]
  );

  const isFirstTransactionRecommended = useMemo(
    () =>
      Boolean(selectedEntityId) &&
      hasAccounts &&
      !isFetchingTransactions &&
      !hasTransactions,
    [hasAccounts, hasTransactions, isFetchingTransactions, selectedEntityId]
  );

  const activeOnboardingStep =
    entityOnboarding?.entityId === selectedEntityId
      ? entityOnboarding.step
      : null;

  useEffect(() => {
    if (!selectedEntityId) {
      return;
    }

    if (isAccountCreationRequired) {
      setIsNewAccountModalOpen(true);
    }
  }, [isAccountCreationRequired, selectedEntityId]);

  useEffect(() => {
    setHasAutoOpenedFirstTransactionModal(false);
  }, [activeOnboardingStep, selectedEntityId]);

  useEffect(() => {
    if (
      activeOnboardingStep === "first-transaction" &&
      isFirstTransactionRecommended &&
      !hasAutoOpenedFirstTransactionModal
    ) {
      setIsNewTransactionModalOpen(true);
      setHasAutoOpenedFirstTransactionModal(true);
    }
  }, [
    activeOnboardingStep,
    hasAutoOpenedFirstTransactionModal,
    isFirstTransactionRecommended,
  ]);

  useEffect(() => {
    if (activeOnboardingStep === "first-transaction" && hasTransactions) {
      clearEntityOnboarding();
    }
  }, [activeOnboardingStep, clearEntityOnboarding, hasTransactions]);

  return (
    <DashboardContext.Provider
      value={{
        dashboard,
        isFetchingDashboard,
        selectedEntityId,
        hasAccounts,
        hasTransactions,
        isAccountCreationRequired,
        isFirstTransactionRecommended,
        activeOnboardingStep,
        closeNewAccountModal,
        isNewAccountModalOpen,
        openNewAccountModal,
        closeNewTransactionModal,
        isNewTransactionModalOpen,
        openNewTransactionModal,
        closeNewRecurringTransactionModal,
        isNewRecurringTransactionModalOpen,
        openNewRecurringTransactionModal,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
