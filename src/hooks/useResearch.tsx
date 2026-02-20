import { useState } from "react";
import { api, ResearchResponse, RefineResponse, FinalizeResponse } from "@/services/api";
import { useResearchContext } from "@/context/ResearchContext";

export const useResearch = () => {
    const { sessionId, setSessionId, isLoading, setIsLoading, error, setError } = useResearchContext();
    const [researchData, setResearchData] = useState<ResearchResponse | null>(null);

    const createResearchSession = async (topic: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.createResearchSession(topic);
            setSessionId(data.sessionId);
            setResearchData(data);
            return data;
        } catch (err) {
            const error = err instanceof Error ? err : new Error("An unknown error occurred");
            setError(error);
            console.error("Research Session Creation Failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const refineResearchSession = async (sessionIdToRefine: string, subtopic: string): Promise<RefineResponse> => {
        setIsLoading(true);
        setError(null);
        try {
            return await api.refineResearchSession(sessionIdToRefine, subtopic);
        } catch (err) {
            const error = err instanceof Error ? err : new Error("An unknown error occurred");
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const finalizeResearchSession = async (sessionIdToFinalize: string, tags: string[] = []): Promise<FinalizeResponse> => {
        setIsLoading(true);
        setError(null);
        try {
            return await api.finalizeResearchSession(sessionIdToFinalize, tags);
        } catch (err) {
            const error = err instanceof Error ? err : new Error("An unknown error occurred");
            setError(error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createResearchSession,
        refineResearchSession,
        finalizeResearchSession,
        isLoading,
        error,
        sessionId,
        researchData,
    };
};
