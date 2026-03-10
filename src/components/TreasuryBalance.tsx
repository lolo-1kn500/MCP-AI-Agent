import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

const treasuryData = {
  total: 247_892.45,
  change: 12.4,
  tokens: [
    { symbol: "ETH", amount: 142.5, value: 156_800, change: 3.2 },
    { symbol: "USDC", amount: 52_340, value: 52_340, change: 0 },
    { symbol: "LINK", amount: 2_800, value: 38_752.45, change: -1.8 },
  ],
};

const TreasuryBalance = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          <DollarSign className="h-4 w-4" />
          Treasury
        </h2>
        <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-mono text-primary">
          <TrendingUp className="h-3 w-3" />
          +{treasuryData.change}%
        </div>
      </div>

      <p className="mb-6 font-mono text-3xl font-bold neon-text">
        ${treasuryData.total.toLocaleString()}
      </p>

      <div className="space-y-3">
        {treasuryData.tokens.map((token) => (
          <div key={token.symbol} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 font-mono text-xs font-bold text-primary">
                {token.symbol.slice(0, 2)}
              </span>
              <div>
                <p className="text-sm font-medium text-card-foreground">{token.symbol}</p>
                <p className="font-mono text-xs text-muted-foreground">{token.amount.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm text-card-foreground">${token.value.toLocaleString()}</p>
              <p className={`flex items-center justify-end gap-0.5 font-mono text-xs ${token.change >= 0 ? "text-primary" : "text-destructive"}`}>
                {token.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(token.change)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default TreasuryBalance;
