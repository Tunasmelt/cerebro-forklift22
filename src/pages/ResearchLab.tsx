import { useState, useCallback } from "react";
import MessageBubble, { ChatMessage } from "@/components/Chat/MessageBubble";
import ChatInput from "@/components/Chat/ChatInput";
import ResearchSidebar from "@/components/Chat/ResearchSidebar";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "ai",
    content:
      "Welcome to the Research Lab. I'm Cerebro — your AI research assistant. What topic would you like to explore today?",
    subtopics: [],
  },
];

const AI_RESPONSES: Record<string, { content: string; subtopics: string[] }> = {
  default: {
    content:
      "I've broken this topic down into several key subtopics for you. Each one can be explored further — just tap a chip or ask me to dive deeper.",
    subtopics: [
      "Core Concepts",
      "Recent Research",
      "Key Applications",
      "Open Questions",
    ],
  },
  "Quantum Computing": {
    content:
      "Quantum Computing leverages quantum mechanics to process information exponentially faster for certain problems. Here are the key areas to explore:",
    subtopics: [
      "Superconducting Qubits",
      "Quantum Machine Learning",
      "Post-Quantum Cryptography",
      "Error Correction",
    ],
  },
};

const ResearchLab = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [currentTopic, setCurrentTopic] = useState("Getting Started");
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = useCallback(
    (text: string) => {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setCurrentTopic(text);
      setIsThinking(true);

      setTimeout(() => {
        const response = AI_RESPONSES[text] || AI_RESPONSES.default;
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: response.content,
          subtopics: response.subtopics,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsThinking(false);
      }, 1200);
    },
    []
  );

  const handleSubtopicClick = useCallback(
    (subtopic: string) => {
      handleSend(subtopic);
    },
    [handleSend]
  );

  return (
    <div className="flex h-screen pt-14">
      {/* Chat area */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-0">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onSubtopicClick={handleSubtopicClick}
            />
          ))}
          {isThinking && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <div className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-primary/30 animate-pulse-glow" />
                <div className="mt-1 w-px flex-1 bg-timeline-line" />
              </div>
              <div className="pb-6">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Cerebro</span>
                <div className="flex gap-1 rounded-lg bg-card border border-border px-4 py-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
        <ChatInput onSend={handleSend} disabled={isThinking} />
      </div>

      {/* Sidebar */}
      <aside className="hidden w-72 border-l border-border p-4 lg:block">
        <ResearchSidebar
          currentTopic={currentTopic}
          summary="Explore subtopics by tapping the chips in the chat, or type a new research question below."
          tags={["Research", "AI", "Discovery"]}
          syncStatus="synced"
        />
      </aside>
    </div>
  );
};

export default ResearchLab;
