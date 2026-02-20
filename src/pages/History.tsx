import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Calendar, Loader2, Download } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ResearchResponse, SessionDetail } from "@/services/api";
import ProgressRing from "@/components/Shared/ProgressRing";
import SummaryModal from "@/components/Chat/SummaryModal";
import { toast } from "sonner";

const History = () => {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<ResearchResponse | null>(null);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<SessionDetail | null>(null);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const queryClient = useQueryClient();
  const debouncedSearch = useMemo(() => search.trim(), [search]);
  const dotClass = (state: "online" | "degraded" | "offline") =>
    state === "online" ? "bg-emerald-400" : state === "degraded" ? "bg-amber-400" : "bg-red-400";
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data: categories = [] } = useQuery({
    queryKey: ["researchCategories"],
    queryFn: () => api.getHistoryCategories(),
    staleTime: 60_000,
  });
  const { data: providerHealth, isError: providerHealthError } = useQuery({
    queryKey: ["providerHealth"],
    queryFn: api.getProviderHealth,
    refetchInterval: 15000,
    retry: 0,
  });

  const { data: paged, isLoading, refetch } = useQuery({
    queryKey: ["researchHistory", selectedCategories, debouncedSearch, page],
    queryFn: () =>
      api.getResearchHistoryPaged({
        categories: selectedCategories,
        search: debouncedSearch,
        page,
        limit: 12,
      }),
    staleTime: 30_000,
  });

  const filtered = paged?.items ?? [];
  const totalPages = paged?.totalPages ?? 1;
  const total = paged?.total ?? 0;
  const dynamicCategories = useMemo(() => categories.slice(0, 20), [categories]);
  const providerStatus = useMemo(() => {
    if (providerHealthError) {
      return {
        backend: "offline" as const,
        llm: "offline" as const,
        airtable: "offline" as const,
        note: "Backend is unreachable.",
      };
    }
    const llmIssue = providerHealth?.llm?.issue;
    const airtableIssue = providerHealth?.airtable?.issue;
    return {
      backend: "online" as const,
      llm: llmIssue ? ("degraded" as const) : providerHealth?.llm?.configured ? ("online" as const) : ("offline" as const),
      airtable: airtableIssue ? ("degraded" as const) : providerHealth?.airtable?.configured ? ("online" as const) : ("offline" as const),
      note: llmIssue?.message || airtableIssue?.message || "",
    };
  }, [providerHealth, providerHealthError]);

  const toggleCategory = (cat: string) => {
    setPage(1);
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]));
  };

  const handleOpenSession = async (session: ResearchResponse) => {
    setSelectedSession(session);
    setIsFetchingDetail(true);
    try {
      const detail = await api.getResearchSession(session.sessionId);
      setSelectedSessionDetail(detail);
    } catch {
      setSelectedSessionDetail(null);
      toast.error("Failed to load full session details.");
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleFinalize = async (selectedTags: string[]) => {
    if (!selectedSession || isFinalizing) return;
    setIsFinalizing(true);
    try {
      const finalized = await api.finalizeResearchSession(selectedSession.sessionId, selectedTags);
      setSelectedSessionDetail((prev) => {
        if (!prev) return prev;
        return { ...prev, summary: finalized.summary, tags: finalized.tags };
      });
      toast.success("Session finalized.");
      await queryClient.invalidateQueries({ queryKey: ["researchHistory"] });
      await queryClient.invalidateQueries({ queryKey: ["researchCategories"] });
    } catch {
      toast.error("Failed to finalize session.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedSession || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await api.exportSessionPdf(selectedSession.sessionId);
      toast.success("PDF export started.");
    } catch {
      toast.error("Failed to export PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    if (isExportingCsv) return;
    setIsExportingCsv(true);
    try {
      await api.exportHistoryCsvFromServer();
      toast.success("CSV export started.");
    } catch {
      api.exportSessionsCsv(filtered);
      toast.success("CSV exported from local data.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  return (
    <div className="min-h-screen pt-14 hero-gradient">
      <div className="container mx-auto px-4 py-8 sm:px-6">
        {/* Title */}
        <div className="mx-auto mb-5 max-w-5xl text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">Research History</h1>
          <p className="mt-1 text-sm text-muted-foreground">Browse, filter, and export your research sessions.</p>
        </div>
        <div className="mx-auto mb-3 flex w-full max-w-5xl flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => void handleExportCsv()}
            disabled={filtered.length === 0 || isExportingCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-card"
          >
            <Download className="h-3.5 w-3.5" />
            {isExportingCsv ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-card"
          >
            Refresh
          </button>
        </div>
        <p className="mx-auto mb-5 max-w-5xl text-center text-xs text-muted-foreground">
          {selectedCategories.length ? `Filtered by: ${selectedCategories.join(", ")}` : "All categories"} • {total} sessions
        </p>
        <div className="mx-auto mb-5 flex w-full max-w-5xl items-center justify-between gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 text-xs text-muted-foreground backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass(providerStatus.backend)}`} />
              Backend
            </span>
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass(providerStatus.llm)}`} />
              Groq
            </span>
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dotClass(providerStatus.airtable)}`} />
              Airtable
            </span>
          </div>
          <span className="line-clamp-1 text-right">{providerStatus.note || "All providers healthy."}</span>
        </div>

        {/* Filter bar */}
        <div className="mx-auto mb-8 flex w-full max-w-5xl flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-sm">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${selectedCategories.includes(cat)
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
              >
                {cat}
              </button>
            ))}
            {selectedCategories.length > 0 && (
              <button
                onClick={() => {
                  setSelectedCategories([]);
                  setPage(1);
                }}
                className="rounded-full px-4 py-1.5 text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Retrieving sessions from Airtable...</p>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((session, i) => (
              <motion.button
                key={session.sessionId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                onClick={() => void handleOpenSession(session)}
                className="group text-left rounded-2xl border border-border bg-card/80 p-5 transition-all duration-200 hover:border-primary/30 hover:glow-accent-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <h3 className="font-display text-sm font-semibold text-foreground line-clamp-1">
                      {session.outline.title}
                    </h3>
                  </div>
                  <ProgressRing percent={session.progress ?? 0} size={36} strokeWidth={2.5} />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <Calendar className="h-3 w-3" />
                  <span>{session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Recent'}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {session.outline.subTopics.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
                    >
                      #{tag.title}
                    </span>
                  ))}
                  {session.outline.subTopics.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{session.outline.subTopics.length - 3} more</span>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">No sessions found.</p>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Summary Modal */}
      <SummaryModal
        open={!!selectedSession}
        onClose={() => {
          setSelectedSession(null);
          setSelectedSessionDetail(null);
        }}
        onFinalize={handleFinalize}
        onExportPdf={handleExportPdf}
        session={
          selectedSession ? {
            topic: selectedSession.outline.title,
            findings: selectedSessionDetail
              ? [
                  selectedSessionDetail.summary || selectedSession.outline.description,
                  ...selectedSessionDetail.refinements.map((x) => `${x.subtopic}: ${x.insight}`),
                ]
              : [selectedSession.outline.description],
            tags: selectedSessionDetail?.tags?.length
              ? selectedSessionDetail.tags
              : selectedSession.outline.subTopics.map((s) => s.title)
          } : { topic: "", findings: [], tags: [] }
        }
      />
      {isFetchingDetail && (
        <div className="fixed bottom-4 right-4 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Loading session details...
        </div>
      )}
    </div>
  );
};

export default History;
