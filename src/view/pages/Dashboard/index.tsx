import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { SectionCards } from "@/components/section-cards";
import { AccountModal } from "@/view/modals/AccountModal";
import {
  DashboardContext,
  DashboardContextProvider,
} from "./context/DashboardContext";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/view/modals/TransactionModal";
import { QuickActions } from "./components/QuickActions";
import { TransactionsTable } from "@/view/components/TransactionTable";
import { TopCategoriesChart } from "./components/TopCategoriesChart";

export default function Dashboard() {
  return (
    <DashboardContextProvider>
      <DashboardContext.Consumer>
        {({
          dashboard,
          isFetchingDashboard,
          // Modals de nova conta
          closeNewAccountModal,
          isNewAccountModalOpen,
          openNewAccountModal,
          // Modals de nova transação
          closeNewTransactionModal,
          isNewTransactionModalOpen,
          openNewTransactionModal,
          selectedEntityId,
        }) => (
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards
              dashboard={dashboard!}
              isFetchingDashboard={isFetchingDashboard}
            />
            <TransactionModal
              isOpen={isNewTransactionModalOpen}
              onClose={closeNewTransactionModal}
              action="create"
            />
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-2">
              <div className="">
                <TopCategoriesChart
                  topCategories={dashboard?.topCategories ?? []}
                  title="Gastos por Categoria"
                />
              </div>

              <div className="">
                <QuickActions
                  onNewAccountClick={openNewAccountModal}
                  onNewTransactionClick={openNewTransactionModal}
                />
              </div>
            </div>
            <TransactionsTable entityId={selectedEntityId!} />

            <AccountModal
              isOpen={isNewAccountModalOpen}
              onClose={closeNewAccountModal}
              action="create"
            />
          </div>
        )}
      </DashboardContext.Consumer>
    </DashboardContextProvider>
  );
}
