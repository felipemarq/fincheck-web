import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "./App.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "./view/components/ui/sonner";
import { Router } from "./Router";
import { AuthProvider } from "./app/contexts/AuthContext";
import { ErrorBoundary } from "./view/components/ErrorBoundary";
import { ErrorBoundaryFallback } from "./view/components/ErrorBoundaryFallback";

function App() {
  // Configurando uma instância do QueryClient com opções padrão
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider storageKey="vite-ui-theme">
        <ErrorBoundary fallback={<ErrorBoundaryFallback />}>
          <AuthProvider>
            <div className=" w-full h-full flex flex-col">
              <Router />
              <Toaster />
            </div>
          </AuthProvider>
        </ErrorBoundary>
      </ThemeProvider>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;
