import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "./AuthGuard";
import { LoginLayout } from "@/view/Layouts/LoginLayout";
import AppLayout from "@/view/Layouts/AppLayout";
import { PageLoader } from "@/view/components/PageLoader";
import Dashboard from "@/view/pages/Dashboard";
import Login from "@/view/pages/Login";

export const Router = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader isLoading={true} />}>
        <Routes>
          <Route element={<AuthGuard isPrivate={false} />}>
            <Route element={<LoginLayout />}>
              <Route path="/login" element={<Login />} />
            </Route>
          </Route>

          <Route element={<AuthGuard isPrivate={true} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
