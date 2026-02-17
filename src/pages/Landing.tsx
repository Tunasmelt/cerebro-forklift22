import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Network, Brain, Workflow } from "lucide-react";
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
];

const Landing = () => {
  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Hero */}
      <section className="container mx-auto px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            <span className="text-gradient">Structured Knowledge,</span>
            <br />
            <span className="text-foreground">Instant Discovery</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-md">
            Your AI Research Assistant for a Deciphered Web
          </p>

          <div className="mt-8 flex gap-3">
            <Link
              to="/research"
              className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              Learn More
            </a>
          </div>
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="container mx-auto px-6 pb-24 flex-1">
        <div className="grid gap-4 sm:grid-cols-3 max-w-3xl ml-auto">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} delay={0.2 + i * 0.1} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/60 backdrop-blur-sm mt-auto">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
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
