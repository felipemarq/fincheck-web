import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import { ThemeProvider } from "@/components/theme-provider";
import Page from "./view/pages/Dashboard";
import { ModeToggle } from "./view/components/ui/mode-toggle";
import { Toaster } from "./view/components/ui/sonner";
import { Router } from "./Router";

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
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div className=" w-full h-full flex flex-col">
          <Router />
          <Toaster />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
