import { motion } from "framer-motion";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  subtopics?: string[];
}

interface MessageBubbleProps {
  message: ChatMessage;
  onSubtopicClick?: (subtopic: string) => void;
}

const MessageBubble = ({ message, onSubtopicClick }: MessageBubbleProps) => {
  const isAI = message.role === "ai";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-3"
    >
      {/* Timeline node */}
      <div className="flex flex-col items-center pt-1">
        <div
          className={`h-2.5 w-2.5 rounded-full border-2 ${
            isAI
              ? "border-primary bg-primary/30 animate-pulse-glow"
              : "border-muted-foreground bg-muted"
          }`}
        />
        <div className="mt-1 w-px flex-1 bg-timeline-line" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          {isAI ? "Cerebro" : "You"}
        </span>
        <div
          className={`max-w-3xl rounded-xl px-4 py-3 text-sm leading-relaxed ${
            isAI
              ? "bg-card border border-border text-foreground"
              : "bg-primary/15 border border-primary/20 text-foreground"
          }`}
        >
          {message.content}
        </div>

        {/* Subtopic chips */}
        {message.subtopics && message.subtopics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.subtopics.map((topic) => (
              <button
                key={topic}
                onClick={() => onSubtopicClick?.(topic)}
                className="rounded-full bg-chip-bg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-chip-hover"
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
