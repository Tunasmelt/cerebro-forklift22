import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Network, Brain, Workflow, History, ShieldCheck, Download } from "lucide-react";
import FeatureCard from "@/components/Landing/FeatureCard";

const features = [
  {
    icon: Network,
    title: "Decompose Topics",
    description: "Break complex research into structured subtopics with AI-powered analysis.",
  },
  {
    icon: Brain,
    title: "Persistent Memory",
    description: "Your research context persists across sessions. Pick up right where you left off.",
  },
  {
    icon: Workflow,
    title: "Automated Workflows",
    description: "Connect to external tools and automate your research pipeline effortlessly.",
  },
  {
    icon: History,
    title: "Searchable History",
    description: "Every session is stored and easy to revisit with filters, tags, and quick retrieval.",
  },
  {
    icon: ShieldCheck,
    title: "Provider Diagnostics",
    description: "Track backend, LLM, and Airtable health in real time to debug issues quickly.",
  },
  {
    icon: Download,
    title: "One-Click Exports",
    description: "Export session reports to PDF and history to CSV for sharing or downstream analysis.",
  },
];

const Landing = () => {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Hero */}
      <section className="container mx-auto px-6 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto flex max-w-4xl flex-col items-center text-center"
        >
          <span className="mb-4 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
            AI Research, Structured End-to-End
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            <span className="text-gradient">Structured Knowledge,</span>
            <br />
            <span className="text-foreground">Instant Discovery</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Go from rough ideas to clear research maps, actionable deep-dives, and reusable history in minutes.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/research"
              className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start Research
            </Link>
            <a
              href="#features"
              className="inline-flex h-11 items-center rounded-lg border border-border bg-card/60 px-6 text-sm font-semibold text-foreground transition-colors hover:bg-card"
            >
              See Features
            </a>
          </div>
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="container mx-auto flex-1 px-6 pb-20">
        <div className="mx-auto mb-6 max-w-2xl text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">
            Everything You Need In One Flow
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Decompose, refine, and retrieve your research without losing context.
          </p>
        </div>
        <div className="mx-auto w-full max-w-6xl lg:hidden">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {features.map((feature, i) => (
              <div key={feature.title} className="min-w-[280px] flex-1 snap-start sm:min-w-[320px]">
                <FeatureCard {...feature} delay={0.2 + i * 0.1} />
              </div>
            ))}
          </div>
        </div>
        <div className="mx-auto hidden w-full max-w-6xl gap-4 lg:grid lg:grid-cols-3">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} delay={0.2 + i * 0.1} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/60 backdrop-blur-sm mt-auto">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-6 py-4 sm:flex-row">
          <span className="text-xs text-muted-foreground">© 2024 Cerebro</span>
          <div className="flex gap-4">
            {["Twitter", "GitHub", "Discord"].map((s) => (
              <a key={s} href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {s}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
