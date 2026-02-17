import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Calendar } from "lucide-react";
import ProgressRing from "@/components/Shared/ProgressRing";
import SummaryModal from "@/components/Chat/SummaryModal";

interface Session {
  id: string;
  topic: string;
  lastActive: string;
  completion: number;
  tags: string[];
  category: string;
  findings: string[];
}

const MOCK_SESSIONS: Session[] = [
  { id: "1", topic: "AI Governance", lastActive: "2024-11-19", completion: 85, tags: ["Policy", "Ethics"], category: "Tech", findings: ["Regulatory frameworks emerging globally", "EU AI Act sets precedent for compliance"] },
  { id: "2", topic: "Fusion Energy", lastActive: "2024-11-06", completion: 72, tags: ["Physics", "Energy"], category: "Science", findings: ["NIF achieved ignition milestone", "Commercial fusion projected by 2035"] },
  { id: "3", topic: "Quantum Computing", lastActive: "2024-11-18", completion: 91, tags: ["Quantum", "Computing"], category: "Tech", findings: ["Error correction breakthroughs in 2024", "IBM roadmap targets 100k qubits"] },
  { id: "4", topic: "DeFi Protocols", lastActive: "2024-10-28", completion: 64, tags: ["Finance", "Crypto"], category: "Finance", findings: ["TVL recovery trends across L2s", "RWA tokenization gaining traction"] },
  { id: "5", topic: "Solid-State Batteries", lastActive: "2024-10-15", completion: 58, tags: ["Materials", "Energy"], category: "Science", findings: ["Toyota targets 2027 production", "Sulfide electrolytes lead in conductivity"] },
  { id: "6", topic: "Reinforcement Learning", lastActive: "2024-11-01", completion: 79, tags: ["AI", "ML"], category: "Tech", findings: ["RLHF powers modern LLM alignment", "Multi-agent RL shows emergent behavior"] },
  { id: "7", topic: "Macro Economics 2025", lastActive: "2024-10-20", completion: 45, tags: ["Economics", "Markets"], category: "Finance", findings: ["Rate cuts expected in Q1", "Emerging markets outperforming"] },
  { id: "8", topic: "CRISPR Therapeutics", lastActive: "2024-11-12", completion: 88, tags: ["Biotech", "Health"], category: "Science", findings: ["First FDA-approved gene therapy", "Sickle cell treatment shows 95% efficacy"] },
  { id: "9", topic: "Edge Computing", lastActive: "2024-10-08", completion: 52, tags: ["Infrastructure", "IoT"], category: "Tech", findings: ["5G enables real-time inference at edge", "AWS Wavelength expanding regions"] },
  { id: "10", topic: "Carbon Markets", lastActive: "2024-10-30", completion: 67, tags: ["Climate", "Finance"], category: "Finance", findings: ["EU ETS prices stabilizing around €80", "Voluntary carbon market growing 30% YoY"] },
];

const CATEGORIES = ["All", "Tech", "Science", "Finance"];

const History = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const filtered = useMemo(() => {
    return MOCK_SESSIONS.filter((s) => {
      const matchesCategory = activeCategory === "All" || s.category === activeCategory;
      const matchesSearch =
        !search ||
        s.topic.toLowerCase().includes(search.toLowerCase()) ||
        s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <div className="min-h-screen pt-14 hero-gradient">
      <div className="container mx-auto px-6 py-10">
        {/* Title */}
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Research History</h1>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((session, i) => (
            <motion.button
              key={session.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              onClick={() => setSelectedSession(session)}
              className="group text-left rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/30 hover:glow-accent-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <h3 className="font-display text-sm font-semibold text-foreground">{session.topic}</h3>
                </div>
                <ProgressRing percent={session.completion} size={36} strokeWidth={2.5} />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Calendar className="h-3 w-3" />
                <span>Last Active</span>
                <span>{session.lastActive}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {session.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">No sessions found.</p>
        )}
      </div>

      {/* Summary Modal */}
      <SummaryModal
        open={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        session={
          selectedSession || { topic: "", findings: [], tags: [] }
        }
      />
    </div>
  );
};

export default History;
