import { Database, Tag, Wifi } from "lucide-react";

type ProviderState = "online" | "degraded" | "offline";

interface ProviderStatus {
  backend: ProviderState;
  llm: ProviderState;
  llmLabel?: string;
  airtable: ProviderState;
  note?: string;
}

interface ResearchSidebarProps {
  currentTopic: string;
  summary: string;
  tags: string[];
  syncStatus?: "synced" | "syncing" | "offline";
  providerStatus?: ProviderStatus;
}

const ResearchSidebar = ({
  currentTopic,
  summary,
  tags,
  syncStatus = "synced",
  providerStatus,
}: ResearchSidebarProps) => {
  const dotClass = (state: ProviderState) =>
    state === "online"
      ? "bg-emerald-400"
      : state === "degraded"
      ? "bg-amber-400"
      : "bg-red-400";

  return (
    <div className="glass-card glow-accent-sm space-y-5 rounded-2xl p-5">
      <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        Research Summary
      </h3>

      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Current Topic:</span>
        <p className="font-display text-sm font-medium text-foreground">{currentTopic}</p>
      </div>

      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Key Summary:</span>
        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-6">{summary}</p>
      </div>

      <div className="space-y-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Tag className="h-3 w-3" /> Tags
        </span>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {providerStatus && (
        <div className="space-y-2 rounded-xl border border-border/80 bg-background/50 p-3">
          <p className="text-xs font-medium text-foreground">Provider Status</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass(providerStatus.backend)}`} />
              Backend
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass(providerStatus.llm)}`} />
              {providerStatus.llmLabel || "LLM"}
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass(providerStatus.airtable)}`} />
              Airtable
            </div>
          </div>
          {providerStatus.note ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{providerStatus.note}</p>
          ) : null}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Wifi
          className={`h-3.5 w-3.5 ${
            syncStatus === "synced"
              ? "text-primary"
              : syncStatus === "syncing"
              ? "text-yellow-400 animate-pulse"
              : "text-muted-foreground"
          }`}
        />
        <span className="text-xs text-muted-foreground capitalize">
          {syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing..." : "Offline"}
        </span>
      </div>
    </div>
  );
};

export default ResearchSidebar;
