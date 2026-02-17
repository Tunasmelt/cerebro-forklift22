import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:glow-accent-sm"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
        <Icon className="h-5 w-5 text-accent-foreground" />
      </div>
      <h3 className="mb-2 font-display text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
};

export default FeatureCard;
