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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/80 p-6 transition-all duration-300 hover:border-primary/70 hover:shadow-lg"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 flex h-full flex-col items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 transition-colors group-hover:bg-primary/20">
          <Icon className="h-6 w-6 text-primary transition-colors group-hover:text-primary" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
            {title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground transition-colors group-hover:text-muted-foreground/80">
            {description}
          </p>
        </div>

        {/* Accent line */}
        <div className="h-1 w-8 bg-primary transition-all duration-300 group-hover:w-12" />
      </div>
    </motion.div>
  );
};

export default FeatureCard;
