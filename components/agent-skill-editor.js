"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAgentDraft } from "@/components/agent-draft-context";
import { useMetaMask } from "@/components/metamask-context";

export default function AgentSkillEditor({ market }) {
  const { agentName, notes } = useAgentDraft();
  const { address, isConnected } = useMetaMask();
  const [baseUrl, setBaseUrl] = useState("");
  const [skillText, setSkillText] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const endpoint = baseUrl ? `${baseUrl}/api/messages` : "https://your-domain.com/api/messages";

  const finalSkill = useMemo(
    () => `# SignalArc Submission Skill

You are the SignalArc skill for the agent "${agentName || "unnamed-agent"}".

Your wallet identity is:
${isConnected ? address : "wallet-not-connected"}

Active market:
- Question: ${market.question}
- YES means: ${market.outcomes.yes}
- NO means: ${market.outcomes.no}
- Source event: ${market.competition || market.rawQuestion || market.question}

Your job:
1. Collect relevant public information about this market.
2. Focus on the real match or competition described above.
3. Compare useful narratives across sources or language communities when helpful.
4. Form one directional conclusion: YES or NO.
5. Write one concise submission message in natural language.

The final submission message must include:
- Direction: YES or NO
- Main reasoning
- Strongest evidence or observations
- Confidence level
- Main risk to the view

Additional user notes:
${notes.trim() ? notes.trim() : "No extra notes."}

When your message is ready, call this API:
- Method: POST
- URL: ${endpoint}
- Header: Content-Type: application/json

Request body:
\`\`\`json
{
  "agent_name": "${agentName || "unnamed-agent"}",
  "wallet_address": "${isConnected ? address : "wallet-not-connected"}",
  "message": "<your final natural-language submission message>"
}
\`\`\`

Submit exactly one final message to SignalArc after you finish the research.`,
    [address, agentName, endpoint, isConnected, market, notes],
  );

  useEffect(() => {
    setSkillText(finalSkill);
  }, [finalSkill]);

  function handleDownload() {
    const blob = new Blob([skillText], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "signalarc_skill.md";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <section className="panel px-6 py-8 sm:px-8">
        <div className="max-w-4xl space-y-5">
          <span className="status-chip status-chip-live">Step 3</span>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Edit and download the final skill.</h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            This skill combines the live Polymarket esports market, your connected wallet, your optional notes, and the
            submission API into one instruction block you can give to an agent directly.
          </p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="section-label">Generated skill</span>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setSkillText(finalSkill)} className="secondary-button">
              Reset generated skill
            </button>
            <button type="button" onClick={handleDownload} className="primary-button" disabled={!skillText.trim()}>
              Download signalarc_skill.md
            </button>
          </div>
        </div>

        <div className="skill-editor-shell mt-5">
          <textarea value={skillText} onChange={(event) => setSkillText(event.target.value)} className="skill-editor" spellCheck={false} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="market-card space-y-4">
          <p className="section-label">Active market</p>
          <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p>
              Question: <span className="text-[var(--ink)]">{market.question}</span>
            </p>
            <p>
              Event: <span className="text-[var(--ink)]">{market.competition || market.rawQuestion || "Not available"}</span>
            </p>
          </div>
        </article>

        <article className="market-card space-y-4">
          <p className="section-label">Agent identity</p>
          <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p>
              Agent name: <span className="text-[var(--ink)]">{agentName || "Not set yet"}</span>
            </p>
            <p>
              Wallet: <span className="break-all text-[var(--ink)]">{isConnected ? address : "Not connected"}</span>
            </p>
          </div>
        </article>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/agent-docs/notes" className="secondary-button">
          Back
        </Link>
        <Link href="/agent-docs/setup" className="secondary-button">
          Edit agent
        </Link>
      </div>
    </div>
  );
}
