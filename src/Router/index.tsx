import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./AuthGuard";
import { LoginLayout } from "@/view/Layouts/LoginLayout";
import AppLayout from "@/view/Layouts/AppLayout";
import { PageLoader } from "@/view/components/PageLoader";
import Dashboard from "@/view/pages/Dashboard";
import CreditCards from "@/view/pages/CreditCards";
import RecurringTransactions from "@/view/pages/RecurringTransactions";
import Taxes from "@/view/pages/Taxes";
const Register = lazy(() => import("@/view/pages/Register"));
const Login = lazy(() => import("@/view/pages/Login"));

export const Router = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader isLoading={true} />}>
        <Routes>
          <Route element={<AuthGuard isPrivate={false} />}>
            <Route element={<LoginLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>
          </Route>

          <Route element={<AuthGuard isPrivate={true} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/credit-cards" element={<CreditCards />} />
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
