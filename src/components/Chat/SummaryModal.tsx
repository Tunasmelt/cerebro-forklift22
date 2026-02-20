import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface SummaryModalProps {
  open: boolean;
  onClose: () => void;
  onFinalize?: (selectedTags: string[]) => Promise<void> | void;
  onExportPdf?: () => Promise<void> | void;
  session: {
    topic: string;
    findings: string[];
    tags: string[];
  };
}

const SummaryModal = ({ open, onClose, onFinalize, onExportPdf, session }: SummaryModalProps) => {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(session.tags));

  useEffect(() => {
    setSelectedTags(new Set(session.tags));
  }, [session.tags, session.topic, open]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,44rem)] -translate-x-1/2 -translate-y-1/2 px-2 sm:px-0"
          >
            <div className="glass-card glow-accent flex max-h-[85vh] flex-col overflow-hidden border border-glass-border p-6">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Session Summary
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Primary Topic</p>
                  <p className="font-display text-base font-medium text-foreground">
                    {session.topic}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto pr-1">
                {/* Key Findings */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Key Findings</h3>
                  <ul className="space-y-2">
                  {session.findings.map((finding, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.1 }}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Check className="h-2.5 w-2.5 text-primary" />
                      </span>
                      {finding}
                    </motion.li>
                  ))}
                  </ul>
                </div>

                {/* Generated Tags */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Generated Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {session.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                          selectedTags.has(tag)
                            ? "bg-primary/20 border-primary/40 text-primary"
                            : "bg-card border-border text-muted-foreground"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-3 border-t border-border pt-4">
                <button
                  onClick={() => void onFinalize?.(Array.from(selectedTags))}
                  className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Finalize
                </button>
                <button
                  onClick={() => void onExportPdf?.()}
                  className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SummaryModal;
