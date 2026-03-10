import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Copy, Check } from "lucide-react";

const WalletConnect = () => {
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const mockAddress = "0x7a3F...8b2E";
  const fullAddress = "0x7a3F91cD42e8B1f5A6d9C3E0bF4a2D7c1E5f8b2E";

  const handleCopy = () => {
    navigator.clipboard.writeText(fullAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (connected) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 font-mono text-sm"
      >
        <span className="h-2 w-2 rounded-full bg-primary pulse-dot" />
        <span className="text-primary">{mockAddress}</span>
        <button onClick={handleCopy} className="ml-1 text-muted-foreground hover:text-primary transition-colors">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setConnected(true)}
      className="flex items-center gap-2 rounded-lg neon-border bg-primary/10 px-5 py-2.5 font-medium text-primary transition-all hover:bg-primary/20"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </motion.button>
  );
};

export default WalletConnect;
