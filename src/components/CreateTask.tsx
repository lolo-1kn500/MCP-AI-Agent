import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Zap } from "lucide-react";

const CreateTask = () => {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setTitle("");
      setSubmitted(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
        <Zap className="h-4 w-4" />
        Create Task
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task description for the swarm..."
            className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
          />
        </div>

        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all ${
                priority === p
                  ? p === "high"
                    ? "bg-destructive/20 text-destructive border border-destructive/30"
                    : p === "medium"
                    ? "bg-warning/20 text-warning border border-warning/30"
                    : "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground border border-transparent hover:border-border"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <motion.button
          type="submit"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          disabled={!title.trim() || submitted}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitted ? (
            <span className="font-mono text-sm">✓ Task dispatched to swarm</span>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Dispatch Task
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default CreateTask;
