import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Teachers from "./pages/Teachers";
import Classes from "./pages/Classes";
import Subjects from "./pages/Subjects";
import Extracurricular from "./pages/Extracurricular";
import Curriculum from "./pages/Curriculum";
import Distribution from "./pages/Distribution";
import Schedule from "./pages/Schedule";
import ImportExport from "./pages/ImportExport";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const Router =
    typeof window !== "undefined" && window.location.protocol === "file:"
      ? HashRouter
      : BrowserRouter;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <Router>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/teachers" element={<Teachers />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/subjects" element={<Subjects />} />
                <Route path="/extracurricular" element={<Extracurricular />} />
                <Route path="/curriculum" element={<Curriculum />} />
                <Route path="/distribution" element={<Distribution />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/import-export" element={<ImportExport />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </Router>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
