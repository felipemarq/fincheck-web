import { useAuth } from "@/app/hooks/useAuth";
import { SectionCards } from "@/components/section-cards";
import { SettlementCards } from "@/components/settlement-cards";
import { TransactionsTable } from "@/view/components/TransactionTable";
import { AccountModal } from "@/view/modals/AccountModal";
import { TransactionModal } from "@/view/modals/TransactionModal";
import { RecurringTransactionModal } from "@/view/modals/RecurringTransactionModal";
import { EntityOnboardingBanner } from "./components/EntityOnboardingBanner";
import { QuickActions } from "./components/QuickActions";
import { TopCategoriesChart } from "./components/TopCategoriesChart";
import {
  DashboardContext,
  DashboardContextProvider,
} from "./context/DashboardContext";

export default function Dashboard() {
  const { activeEntity } = useAuth();

  return (
    <DashboardContextProvider>
      <DashboardContext.Consumer>
        {({
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
          isAccountCreationRequired,
          hasAccounts,
          isFirstTransactionRecommended,
        }) => (
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {activeEntity && (
              <EntityOnboardingBanner
                activeEntity={activeEntity}
                hasAccounts={hasAccounts}
                isFirstTransactionRecommended={isFirstTransactionRecommended}
                onCreateAccount={openNewAccountModal}
                onCreateTransaction={openNewTransactionModal}
              />
            )}

            <SectionCards
              dashboard={dashboard!}
              isFetchingDashboard={isFetchingDashboard}
            />
            <SettlementCards
              dashboard={dashboard!}
              isFetchingDashboard={isFetchingDashboard}
            />

            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-2">
              <TopCategoriesChart
                topCategories={dashboard?.topCategories ?? []}
                title="Gastos por Categoria"
              />

              <QuickActions
                hasAccounts={hasAccounts}
                onNewAccountClick={openNewAccountModal}
                onNewTransactionClick={openNewTransactionModal}
                onNewRecurringTransactionClick={openNewRecurringTransactionModal}
              />
            </div>

            <TransactionsTable entityId={selectedEntityId!} />

            <RecurringTransactionModal
              isOpen={isNewRecurringTransactionModalOpen}
              onClose={closeNewRecurringTransactionModal}
              action="create"
            />

            <TransactionModal
              isOpen={isNewTransactionModalOpen}
              onClose={closeNewTransactionModal}
              action="create"
            />

            <AccountModal
              isOpen={isNewAccountModalOpen}
              onClose={closeNewAccountModal}
              action="create"
              isMandatory={isAccountCreationRequired}
            />
          </div>
        )}
      </DashboardContext.Consumer>
    </DashboardContextProvider>
  );
}
