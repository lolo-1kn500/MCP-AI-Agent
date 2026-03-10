import { useState } from "react";
import { motion } from "framer-motion";
import { Vote, ThumbsUp, ThumbsDown, Clock, CheckCircle2 } from "lucide-react";

interface Proposal {
  id: number;
  title: string;
  status: "active" | "passed" | "pending";
  votesFor: number;
  votesAgainst: number;
  deadline: string;
}

const proposals: Proposal[] = [
  { id: 47, title: "Allocate 10,000 USDC to DeFi yield vault", status: "active", votesFor: 142, votesAgainst: 23, deadline: "2d 14h" },
  { id: 46, title: "Upgrade swarm consensus algorithm to v3", status: "active", votesFor: 89, votesAgainst: 45, deadline: "5d 8h" },
  { id: 45, title: "Add cross-chain bridge to Arbitrum", status: "passed", votesFor: 201, votesAgainst: 12, deadline: "Ended" },
  { id: 44, title: "Implement MEV protection module", status: "pending", votesFor: 0, votesAgainst: 0, deadline: "Starts in 1d" },
];

const statusConfig = {
  active: { icon: Vote, label: "Active", className: "bg-primary/10 text-primary border-primary/20" },
  passed: { icon: CheckCircle2, label: "Passed", className: "bg-success/10 text-success border-success/20" },
  pending: { icon: Clock, label: "Pending", className: "bg-warning/10 text-warning border-warning/20" },
};

const DAOProposals = () => {
  const [voted, setVoted] = useState<Record<number, "for" | "against">>({});

  const handleVote = (id: number, vote: "for" | "against") => {
    setVoted((prev) => ({ ...prev, [id]: vote }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        <Vote className="h-4 w-4" />
        DAO Proposals
      </h2>

      <div className="space-y-3">
        {proposals.map((proposal) => {
          const totalVotes = proposal.votesFor + proposal.votesAgainst;
          const forPercent = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 50;
          const config = statusConfig[proposal.status];
          const StatusIcon = config.icon;

          return (
            <div key={proposal.id} className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{proposal.id}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${config.className}`}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-card-foreground">{proposal.title}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">{proposal.deadline}</span>
              </div>

              {totalVotes > 0 && (
                <div className="mb-3">
                  <div className="mb-1 flex justify-between font-mono text-xs">
                    <span className="text-primary">For: {proposal.votesFor}</span>
                    <span className="text-destructive">Against: {proposal.votesAgainst}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${forPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {proposal.status === "active" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVote(proposal.id, "for")}
                    disabled={!!voted[proposal.id]}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 font-mono text-xs transition-all ${
                      voted[proposal.id] === "for"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-transparent"
                    } disabled:cursor-not-allowed`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    Vote For
                  </button>
                  <button
                    onClick={() => handleVote(proposal.id, "against")}
                    disabled={!!voted[proposal.id]}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 font-mono text-xs transition-all ${
                      voted[proposal.id] === "against"
                        ? "bg-destructive/20 text-destructive border border-destructive/30"
                        : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-transparent"
                    } disabled:cursor-not-allowed`}
                  >
                    <ThumbsDown className="h-3 w-3" />
                    Vote Against
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DAOProposals;
