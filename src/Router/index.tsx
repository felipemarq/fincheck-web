import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthGuard } from "./AuthGuard";
import AppLayout from "@/view/Layouts/AppLayout";
import { LoginLayout } from "@/view/Layouts/LoginLayout";
import { PageLoader } from "@/view/components/PageLoader";
import Accounts from "@/view/pages/Accounts";
import Contacts from "@/view/pages/Contacts";
import CreditCards from "@/view/pages/CreditCards";
import Dashboard from "@/view/pages/Dashboard";
import Entities from "@/view/pages/Entities";
import Payables from "@/view/pages/Payables";
import Receivables from "@/view/pages/Receivables";
import RecurringTransactions from "@/view/pages/RecurringTransactions";
import Taxes from "@/view/pages/Taxes";

const Register = lazy(() => import("@/view/pages/Register"));
const Login = lazy(() => import("@/view/pages/Login"));
const ForgotPassword = lazy(() => import("@/view/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/view/pages/ResetPassword"));

export const Router = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader isLoading={true} />}>
        <Routes>
          <Route element={<AuthGuard isPrivate={false} />}>
            <Route element={<LoginLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Route>
          </Route>

          <Route element={<AuthGuard isPrivate={true} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/entities" element={<Entities />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/payables" element={<Payables />} />
              <Route path="/receivables" element={<Receivables />} />
              <Route path="/credit-cards" element={<CreditCards />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/taxes" element={<Taxes />} />
              <Route
                path="/recurring-transactions"
                element={<RecurringTransactions />}
              />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
