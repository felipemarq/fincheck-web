import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthGuard } from "./AuthGuard";
import { PersonalFeatureGuard } from "./PersonalFeatureGuard";
import { OrganizationPermissionGuard } from "./OrganizationPermissionGuard";
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
import Receivables from "@/view/pages/Receivables";

const Register = lazy(() => import("@/view/pages/Register"));
const Login = lazy(() => import("@/view/pages/Login"));
const ForgotPassword = lazy(() => import("@/view/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/view/pages/ResetPassword"));
const BodyWeight = lazy(() => import("@/view/pages/BodyWeight"));
const VerifyEmail = lazy(() => import("@/view/pages/VerifyEmail"));
const OrganizationTeam = lazy(() => import("@/view/pages/OrganizationTeam"));
const OrganizationProfile = lazy(
  () => import("@/view/pages/OrganizationProfile")
);
const OrganizationInvitation = lazy(
  () => import("@/view/pages/OrganizationInvitation")
);

export const Router = () => {
  return (
    <BrowserRouter
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Suspense fallback={<PageLoader isLoading={true} />}>
        <Routes>
          <Route path="/invite/:token" element={<OrganizationInvitation />} />

          <Route element={<AuthGuard isPrivate={false} />}>
            <Route element={<LoginLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
            </Route>
          </Route>

          <Route element={<AuthGuard isPrivate={true} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                element={
                  <OrganizationPermissionGuard permission="dashboard.read" />
                }
              >
                <Route path="/dashboard" element={<OperationsDashboardPage />} />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="quotations.read" />
                }
              >
                <Route path="/quotations" element={<Quotations />} />
                <Route
                  path="/quotations/:quotationId"
                  element={<QuotationDetails />}
                />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="quotations.create" />
                }
              >
                <Route path="/quotations/new" element={<QuotationForm />} />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="quotations.update" />
                }
              >
                <Route
                  path="/quotations/:quotationId/edit"
                  element={<QuotationForm />}
                />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="orders.read" />
                }
              >
                <Route path="/orders" element={<PurchaseOrders />} />
                <Route path="/items" element={<PurchaseOrderItems />} />
                <Route
                  path="/orders/:purchaseOrderId"
                  element={<PurchaseOrderDetails />}
                />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="orders.create" />
                }
              >
                <Route path="/orders/new" element={<PurchaseOrderForm />} />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="orders.update" />
                }
              >
                <Route
                  path="/orders/:purchaseOrderId/edit"
                  element={<PurchaseOrderForm />}
                />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="purchases.read" />
                }
              >
                <Route path="/purchases" element={<SupplierPurchases />} />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="customers.read" />
                }
              >
                <Route path="/customers" element={<Customers />} />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="products.read" />
                }
              >
                <Route path="/products" element={<Products />} />
                <Route path="/pricing" element={<PricingCalculator />} />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="finance.read" />
                }
              >
                <Route path="/finance" element={<Finance />} />
                <Route path="/receivables" element={<Receivables />} />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="organization.read" />
                }
              >
                <Route
                  path="/settings/organization"
                  element={<OrganizationProfile />}
                />
              </Route>
              <Route
                element={
                  <OrganizationPermissionGuard permission="members.read" />
                }
              >
                <Route path="/settings/team" element={<OrganizationTeam />} />
              </Route>
              <Route element={<PersonalFeatureGuard feature="BODY_WEIGHT" />}>
                <Route path="/me/peso" element={<BodyWeight />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
