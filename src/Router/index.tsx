import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthGuard } from "./AuthGuard";
import AppLayout from "@/view/Layouts/AppLayout";
import { LoginLayout } from "@/view/Layouts/LoginLayout";
import { PageLoader } from "@/view/components/PageLoader";
import Customers from "@/view/pages/Customers";
import PurchaseOrders from "@/view/pages/PurchaseOrders";
import PurchaseOrderDetails from "@/view/pages/PurchaseOrders/Details";
import PurchaseOrderForm from "@/view/pages/PurchaseOrders/Form";
import PurchaseOrderItems from "@/view/pages/PurchaseOrderItems";
import OperationsDashboardPage from "@/view/pages/OperationsDashboard";
import Products from "@/view/pages/Products";
import Finance from "@/view/pages/Finance";
import SupplierPurchases from "@/view/pages/SupplierPurchases";
import PricingCalculator from "@/view/pages/PricingCalculator";
import Quotations from "@/view/pages/Quotations";
import QuotationDetails from "@/view/pages/Quotations/Details";
import QuotationForm from "@/view/pages/Quotations/Form";

const Register = lazy(() => import("@/view/pages/Register"));
const Login = lazy(() => import("@/view/pages/Login"));
const ForgotPassword = lazy(() => import("@/view/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/view/pages/ResetPassword"));

export const Router = () => {
  return (
    <BrowserRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<OperationsDashboardPage />} />
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/quotations/new" element={<QuotationForm />} />
              <Route
                path="/quotations/:quotationId"
                element={<QuotationDetails />}
              />
              <Route
                path="/quotations/:quotationId/edit"
                element={<QuotationForm />}
              />
              <Route path="/orders" element={<PurchaseOrders />} />
              <Route path="/items" element={<PurchaseOrderItems />} />
              <Route path="/purchases" element={<SupplierPurchases />} />
              <Route path="/orders/new" element={<PurchaseOrderForm />} />
              <Route
                path="/orders/:purchaseOrderId"
                element={<PurchaseOrderDetails />}
              />
              <Route
                path="/orders/:purchaseOrderId/edit"
                element={<PurchaseOrderForm />}
              />
              <Route path="/customers" element={<Customers />} />
              <Route path="/products" element={<Products />} />
              <Route path="/pricing" element={<PricingCalculator />} />
              <Route path="/finance" element={<Finance />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
