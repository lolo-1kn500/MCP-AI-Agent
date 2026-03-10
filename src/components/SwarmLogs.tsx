import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  agent: string;
  message: string;
  level: "info" | "warn" | "success" | "error";
}

const agentNames = ["ALPHA-7", "BETA-3", "GAMMA-9", "DELTA-1", "EPSILON-5"];
const messages = [
  { msg: "Scanning mempool for arbitrage opportunities...", level: "info" as const },
  { msg: "Found profitable trade route: ETH → USDC → LINK", level: "success" as const },
  { msg: "Executing swap: 2.5 ETH @ 1,745.20", level: "info" as const },
  { msg: "Gas price spike detected: 45 gwei → 120 gwei", level: "warn" as const },
  { msg: "Transaction confirmed: 0x7a3f...8b2e", level: "success" as const },
  { msg: "Rebalancing portfolio weights...", level: "info" as const },
  { msg: "Slippage exceeded threshold on DEX route", level: "warn" as const },
  { msg: "DAO proposal #47 requires attention", level: "info" as const },
  { msg: "MEV protection activated for pending tx", level: "info" as const },
  { msg: "Yield farm APY updated: 12.4% → 15.7%", level: "success" as const },
  { msg: "Network congestion: switching to L2 bridge", level: "warn" as const },
  { msg: "Cross-chain bridge transfer initiated", level: "info" as const },
  { msg: "RPC endpoint timeout, failover to backup", level: "error" as const },
  { msg: "Consensus reached: allocating 500 USDC to vault", level: "success" as const },
];

const levelColors: Record<string, string> = {
  info: "text-secondary",
  warn: "text-warning",
  success: "text-primary",
  error: "text-destructive",
};

const SwarmLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    // Initial logs
    const initial: LogEntry[] = Array.from({ length: 8 }, () => {
      const entry = messages[Math.floor(Math.random() * messages.length)];
      return {
        id: idRef.current++,
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        agent: agentNames[Math.floor(Math.random() * agentNames.length)],
        message: entry.msg,
        level: entry.level,
      };
    });
    setLogs(initial);

    const interval = setInterval(() => {
      const entry = messages[Math.floor(Math.random() * messages.length)];
      setLogs((prev) => [
        ...prev.slice(-50),
        {
          id: idRef.current++,
          timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
          agent: agentNames[Math.floor(Math.random() * agentNames.length)],
          message: entry.msg,
          level: entry.level,
        },
      ]);
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          <Terminal className="h-4 w-4" />
          Swarm Activity
        </h2>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary pulse-dot" />
          <span className="font-mono text-xs text-primary">{agentNames.length} agents online</span>
        </div>
      </div>

      <div ref={scrollRef} className="h-80 overflow-y-auto terminal-scroll p-4 font-mono text-xs leading-relaxed">
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-2 py-0.5"
          >
            <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
            <span className="text-accent shrink-0">[{log.agent}]</span>
            <span className={levelColors[log.level]}>{log.message}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SwarmLogs;
