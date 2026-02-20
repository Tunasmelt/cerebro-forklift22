import { useState, useCallback } from "react";
import { useResearch } from "@/hooks/useResearch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MessageBubble, { ChatMessage } from "@/components/Chat/MessageBubble";
import ChatInput from "@/components/Chat/ChatInput";
import ResearchSidebar from "@/components/Chat/ResearchSidebar";
import { api } from "@/services/api";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    role: "ai",
    content:
      "Welcome to the Research Lab. I'm Cerebro — your AI research assistant. What topic would you like to explore today?",
    subtopics: [],
  },
];

const ResearchLab = () => {
  const { createResearchSession, refineResearchSession, isLoading: isResearchLoading, sessionId } = useResearch();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [currentTopic, setCurrentTopic] = useState("Getting Started");
  const [sidebarSummary, setSidebarSummary] = useState("Explore subtopics by tapping the chips in the chat, or type a new research question below.");
  const [sidebarTags, setSidebarTags] = useState<string[]>(["Research", "AI", "Discovery"]);
  const [isThinking, setIsThinking] = useState(false);
  const [lastIssue, setLastIssue] = useState<string>("");

  const { data: providerHealth, isError: providerHealthError } = useQuery({
    queryKey: ["providerHealth"],
    queryFn: api.getProviderHealth,
    refetchInterval: 15000,
    retry: 0,
  });

  const classifyIssue = (message: string): string => {
    const text = message.toLowerCase();
    if (text.includes("failed to fetch") || text.includes("network")) return "Backend is unreachable.";
    if (text.includes("quota") || text.includes("resource_exhausted") || text.includes("429")) {
      return "Groq is rate-limited or quota-limited.";
    }
    if (text.includes("airtable") || text.includes("422") || text.includes("invalid_multiple_choice_options")) {
      return "Airtable rejected part of the write payload.";
    }
    return message;
  };

  const providerStatus = (() => {
    if (providerHealthError) {
      return {
        backend: "offline" as const,
        llm: "offline" as const,
        llmLabel: "Groq",
        airtable: "offline" as const,
        note: "Backend is unreachable.",
      };
    }
    const llmIssue = providerHealth?.llm?.issue;
    const airtableIssue = providerHealth?.airtable?.issue;
    return {
      backend: "online" as const,
      llm: llmIssue ? "degraded" as const : (providerHealth?.llm?.configured ? "online" as const : "offline" as const),
      llmLabel: providerHealth?.llm?.provider ? providerHealth.llm.provider.toUpperCase() : "Groq",
      airtable: airtableIssue ? "degraded" as const : (providerHealth?.airtable?.configured ? "online" as const : "offline" as const),
      note: lastIssue || llmIssue?.message || airtableIssue?.message || "",
    };
  })();

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setCurrentTopic(text);
      setIsThinking(true);

      try {
        const data = await createResearchSession(text);
        if (data) {
          await queryClient.invalidateQueries({ queryKey: ["researchHistory"] });
          setSidebarSummary(data.outline.description);
          setSidebarTags(data.outline.subTopics.map((s) => s.title));
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "ai",
            content: data.outline.description,
            subtopics: data.outline.subTopics.map((s) => s.title),
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "I encountered an error while researching.";
        setLastIssue(classifyIssue(message));
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: message,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } finally {
        setIsThinking(false);
        void queryClient.invalidateQueries({ queryKey: ["providerHealth"] });
      }
    },
    [createResearchSession, queryClient]
  );

  const handleSubtopicClick = useCallback(
    async (subtopic: string) => {
      if (isThinking || isResearchLoading) return;
      if (!sessionId) {
        handleSend(subtopic);
        return;
      }

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: `Deep-dive: ${subtopic}`,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);
      try {
        const refined = await refineResearchSession(sessionId, subtopic);
        setSidebarSummary(refined.insight);
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: refined.insight,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "I couldn't generate a deep-dive for that subtopic. Please try again.";
        setLastIssue(classifyIssue(message));
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: message,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } finally {
        setIsThinking(false);
        void queryClient.invalidateQueries({ queryKey: ["providerHealth"] });
      }
    },
    [handleSend, isResearchLoading, isThinking, refineResearchSession, sessionId]
  );

  return (
    <div className="min-h-screen pt-16">
      <div className="container mx-auto px-4 pb-6 sm:px-6">
        <div className="mb-5 text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">Research Lab</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ask, decompose, and deep-dive without leaving context.</p>
        </div>

        <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Chat area */}
          <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onSubtopicClick={handleSubtopicClick}
                />
              ))}
              {(isThinking || isResearchLoading) && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <div className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-primary/30 animate-pulse-glow" />
                    <div className="mt-1 w-px flex-1 bg-timeline-line" />
                  </div>
                  <div className="pb-6">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Cerebro</span>
                    <div className="flex gap-1 rounded-lg border border-border bg-card px-4 py-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <ChatInput onSend={handleSend} disabled={isThinking || isResearchLoading} />
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <ResearchSidebar
                currentTopic={currentTopic}
                summary={sessionId ? sidebarSummary : "Explore subtopics by tapping the chips in the chat, or type a new research question below."}
                tags={sidebarTags}
                syncStatus={sessionId ? "synced" : "offline"}
                providerStatus={providerStatus}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ResearchLab;
