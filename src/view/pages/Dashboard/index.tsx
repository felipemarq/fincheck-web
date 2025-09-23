import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";

import data from "./data.json";
import { useDashboard } from "@/app/hooks/useDashboard";

import { AccountModal } from "@/view/modals/AccountModal";
import { useState } from "react";
import {
  DashboardContext,
  DashboardContextProvider,
} from "./context/DashboardContext";
import { Button } from "@/components/ui/button";
import { TransactionModal } from "@/view/modals/TransactionModal";
import { QuickActions } from "./components/QuickActions";

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
        }) => (
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <SectionCards
              dashboard={dashboard!}
              isFetchingDashboard={isFetchingDashboard}
            />
            <Button onClick={openNewAccountModal}>Nova Conta</Button>
            <Button onClick={openNewTransactionModal}>Nova Transação</Button>
            <TransactionModal
              isOpen={isNewTransactionModalOpen}
              onClose={closeNewTransactionModal}
              action="create"
            />
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
              <div className="">
                <ChartAreaInteractive />
              </div>

              <div className="">
                <QuickActions />
              </div>
            </div>

            <DataTable data={data} />
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
