import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import HyggeDetail from "@/pages/hygge-detail";
import HyggeStats from "@/pages/hygge-stats";
import ProvytaDetail from "@/pages/provyta-detail";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/hygge/:id" component={HyggeDetail} />
      <Route path="/hygge/:id/stats" component={HyggeStats} />
      <Route path="/hygge/:hyggeId/provyta/:provytaId" component={ProvytaDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
