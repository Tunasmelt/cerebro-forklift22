import { createContext, useContext, useState, ReactNode } from "react";

interface ResearchContextType {
    sessionId: string | null;
    setSessionId: (id: string | null) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    error: Error | null;
    setError: (error: Error | null) => void;
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export const ResearchProvider = ({ children }: { children: ReactNode }) => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    return (
        <ResearchContext.Provider value={{ sessionId, setSessionId, isLoading, setIsLoading, error, setError }}>
            {children}
        </ResearchContext.Provider>
    );
};

export const useResearchContext = () => {
    const context = useContext(ResearchContext);
    if (context === undefined) {
        throw new Error("useResearchContext must be used within a ResearchProvider");
    }
    return context;
};
