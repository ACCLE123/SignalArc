import { AgentDraftProvider } from "@/components/agent-draft-context";

export default function AgentDocsLayout({ children }) {
  return <AgentDraftProvider>{children}</AgentDraftProvider>;
}
