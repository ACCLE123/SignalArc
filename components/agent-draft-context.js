"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "signalarc-agent-draft";

const AgentDraftContext = createContext(null);

export function AgentDraftProvider({ children }) {
  const [agentName, setAgentName] = useState("");
  const [notes, setNotes] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);
        setAgentName(typeof parsed.agentName === "string" ? parsed.agentName : "");
        setNotes(typeof parsed.notes === "string" ? parsed.notes : "");
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        agentName,
        notes,
      }),
    );
  }, [agentName, isHydrated, notes]);

  return (
    <AgentDraftContext.Provider
      value={{
        agentName,
        isHydrated,
        notes,
        setAgentName,
        setNotes,
      }}
    >
      {children}
    </AgentDraftContext.Provider>
  );
}

export function useAgentDraft() {
  const context = useContext(AgentDraftContext);

  if (!context) {
    throw new Error("useAgentDraft must be used within AgentDraftProvider.");
  }

  return context;
}
