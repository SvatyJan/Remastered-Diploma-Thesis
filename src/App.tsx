import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import GameHub from "./pages/GameHub";
import Character from "./pages/Character";
import Shop from "./pages/Shop";
import SpellShop from "./pages/SpellShop";
import Combat from "./pages/Combat";
import Chat from "./pages/Chat";
import Friends from "./pages/Friends";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/game" element={<GameHub />} />
          <Route path="/game/character" element={<Character />} />
          <Route path="/game/shop" element={<Shop />} />
          <Route path="/game/spellshop" element={<SpellShop />} />
          <Route path="/game/combat" element={<Combat />} />
          <Route path="/game/chat" element={<Chat />} />
          <Route path="/game/friends" element={<Friends />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;