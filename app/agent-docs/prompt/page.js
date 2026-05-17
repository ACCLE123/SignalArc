import AgentSkillEditor from "@/components/agent-skill-editor";
import { getActiveEsportsMarket } from "@/lib/active-market";

export default async function AgentPromptPage() {
  const market = await getActiveEsportsMarket();

  return <AgentSkillEditor market={market} />;
}
