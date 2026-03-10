import { motion } from "framer-motion";
import { Bot, Activity } from "lucide-react";
import WalletConnect from "@/components/WalletConnect";
import TreasuryBalance from "@/components/TreasuryBalance";
import CreateTask from "@/components/CreateTask";
import SwarmLogs from "@/components/SwarmLogs";
import DAOProposals from "@/components/DAOProposals";

const Index = () => {
  return (
    <div className="min-h-screen bg-background grid-bg scan-line">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg neon-border bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold neon-text tracking-tight">HIVEMIND</h1>
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                <Activity className="h-2.5 w-2.5" />
                AI Agent Swarm Protocol
              </p>
            </div>
          </motion.div>

          <WalletConnect />
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6">
            <TreasuryBalance />
            <CreateTask />
          </div>

          {/* Center - Logs */}
          <div className="lg:col-span-2 space-y-6">
            <SwarmLogs />
            <DAOProposals />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
