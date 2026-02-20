export interface ResearchResponse {
    sessionId: string;
    createdAt?: string;
    tags?: string[];
    progress?: number;
    outline: {
        title: string;
        description: string;
        subTopics: Array<{
            id: string;
            title: string;
            description: string;
        }>;
    };
}

export interface SessionRefinement {
    subtopic: string;
    insight: string;
    createdAt?: string;
}

export interface SessionDetail extends ResearchResponse {
    refinements: SessionRefinement[];
    summary?: string;
    tags: string[];
}

export interface RefineResponse {
    sessionId: string;
    subtopic: string;
    insight: string;
}

export interface FinalizeResponse {
    sessionId: string;
    summary: string;
    tags: string[];
}

export interface PagedHistoryResponse {
    items: ResearchResponse[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface ProviderIssue {
    kind: string;
    message: string;
    updatedAt: string;
}

export interface ProviderHealthResponse {
    backend: { status: "online" | "offline" };
    llm: {
        provider: string;
        configured: boolean;
        model: string;
        fallbackOnQuota: boolean;
        issue?: ProviderIssue;
    };
    airtable: {
        configured: boolean;
        baseId: string;
        table: string;
        issue?: ProviderIssue;
    };
}

const MOCK_RESPONSE: ResearchResponse = {
    sessionId: "mock-session-123",
    outline: {
        title: "Mock Research Topic",
        description: "This is a mock response because the backend is unreachable or mock mode is enabled.",
        subTopics: [
            { id: "1", title: "Subtopic 1", description: "Description for subtopic 1" },
            { id: "2", title: "Subtopic 2", description: "Description for subtopic 2" },
            { id: "3", title: "Subtopic 3", description: "Description for subtopic 3" },
            { id: "4", title: "Subtopic 4", description: "Description for subtopic 4" },
        ],
    },
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const IS_MOCK = import.meta.env.VITE_MOCK_BACKEND === "true";
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "";

const request = async <T>(path: string, init?: RequestInit, timeoutMs: number = 30000): Promise<T> => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            headers: {
                ...(init?.headers || {}),
                ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            const errorText = await response.text();
            let detail = errorText;
            try {
                const parsed = JSON.parse(errorText) as { detail?: string };
                if (parsed?.detail) detail = parsed.detail;
            } catch {
                // Keep raw text if not JSON.
            }
            throw new Error(`API Error ${response.status}: ${detail || response.statusText}`);
        }
        return (await response.json()) as T;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error("Request timed out. Please try again.");
        }
        throw error;
    } finally {
        window.clearTimeout(timer);
    }
};

export const api = {
    createResearchSession: async (topic: string): Promise<ResearchResponse> => {
        if (IS_MOCK) {
            console.log("Returning mock data (MOCK_BACKEND=true)");
            return new Promise((resolve) => setTimeout(() => resolve(MOCK_RESPONSE), 1000));
        }

        try {
            return await request<ResearchResponse>("/research/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    topic: topic,
                }),
            });
        } catch (error) {
            console.error("API Request Failed:", error);
            throw error;
        }
    },

    getResearchHistory: async (params?: { category?: string; search?: string }): Promise<ResearchResponse[]> => {
        try {
            const query = new URLSearchParams({
                ...(params?.category ? { category: params.category } : {}),
                ...(params?.search ? { search: params.search } : {}),
            });
            return await request<ResearchResponse[]>(`/research/history?${query.toString()}`);
        } catch (error) {
            console.error("Failed to fetch research history:", error);
            throw error;
        }
    },

    getResearchHistoryPaged: async (params?: {
        categories?: string[];
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<PagedHistoryResponse> => {
        const category = params?.categories?.length ? params.categories.join(",") : "All";
        const query = new URLSearchParams({
            category,
            ...(params?.search ? { search: params.search } : {}),
            page: String(params?.page ?? 1),
            limit: String(params?.limit ?? 12),
        });
        return await request<PagedHistoryResponse>(`/research/history/paged?${query.toString()}`);
    },

    getHistoryCategories: async (): Promise<string[]> => {
        return await request<string[]>(`/research/categories`);
    },

    getProviderHealth: async (): Promise<ProviderHealthResponse> => {
        return await request<ProviderHealthResponse>(`/health/providers`, undefined, 8000);
    },

    refineResearchSession: async (sessionId: string, subtopic: string): Promise<RefineResponse> => {
        return await request<RefineResponse>("/research/refine", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sessionId,
                subtopic,
            }),
        });
    },

    getResearchSession: async (sessionId: string): Promise<SessionDetail> => {
        return await request<SessionDetail>(`/research/session/${sessionId}`);
    },

    finalizeResearchSession: async (sessionId: string, tags: string[] = []): Promise<FinalizeResponse> => {
        return await request<FinalizeResponse>("/research/finalize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sessionId,
                tags,
            }),
        });
    },

    exportSessionPdf: async (sessionId: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/research/export/pdf/${sessionId}`, {
            headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {},
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cerebro-${sessionId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    exportSessionsCsv: (sessions: ResearchResponse[]): void => {
        const header = ["sessionId", "createdAt", "title", "description", "subtopics"];
        const rows = sessions.map((s) => [
            s.sessionId,
            s.createdAt || "",
            `"${s.outline.title.replace(/"/g, '""')}"`,
            `"${s.outline.description.replace(/"/g, '""')}"`,
            `"${s.outline.subTopics.map((x) => x.title).join(", ").replace(/"/g, '""')}"`,
        ]);
        const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cerebro-history-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    exportHistoryCsvFromServer: async (): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/research/export/csv`, {
            headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {},
        });
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `cerebro-history-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};
