"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAgentDraft } from "@/components/agent-draft-context";
import { useMetaMask } from "@/components/metamask-context";

const SKILL_PACKAGE_NAME = "signalarc-submission-agent";
const ZIP_FILENAME = `${SKILL_PACKAGE_NAME}.zip`;
const TASK_FILENAME = "current-task.yaml";

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let current = i;

    for (let j = 0; j < 8; j += 1) {
      current = (current & 1) !== 0 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }

    table[i] = current >>> 0;
  }

  return table;
})();

function escapeYamlString(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function dateToDos(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return {
    date: dosDate,
    time: dosTime,
  };
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const now = dateToDos(new Date());
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.path);
    const contentBytes = encoder.encode(file.content);
    const checksum = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, now.time, true);
    localView.setUint16(12, now.date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, now.time, true);
    centralView.setUint16(14, now.date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, contentBytes.length, true);
    centralView.setUint32(24, contentBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);

    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectory = concatUint8Arrays(centralParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return concatUint8Arrays([...localParts, centralDirectory, endRecord]);
}

function downloadZip(files) {
  const zipBytes = buildZip(files);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = ZIP_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function FilePreview({ title, pathname, description, content }) {
  return (
    <section className="panel p-6">
      <div className="space-y-2">
        <span className="section-label">{title}</span>
        <p className="text-sm leading-7 text-[var(--muted)]">{description}</p>
        <p className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[var(--ink)]">
          {pathname}
        </p>
      </div>

      <div className="skill-editor-shell mt-5">
        <pre className="skill-preview">{content}</pre>
      </div>
    </section>
  );
}

export default function AgentSkillEditor({ market }) {
  const { agentName, notes } = useAgentDraft();
  const { address, isConnected } = useMetaMask();
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const currentMarketUrl = baseUrl ? `${baseUrl}/api/market/current` : "https://your-domain.com/api/market/current";
  const submissionUrl = baseUrl ? `${baseUrl}/api/messages` : "https://your-domain.com/api/messages";

  const taskYaml = useMemo(
    () => `agent:
  name: "${escapeYamlString(agentName || "unnamed-agent")}"
  wallet_address: "${escapeYamlString(isConnected ? address : "wallet-not-connected")}"

signal_arc:
  base_url: "${escapeYamlString(baseUrl || "https://your-domain.com")}"
  current_market_url: "${escapeYamlString(currentMarketUrl)}"
  submission_url: "${escapeYamlString(submissionUrl)}"

runtime:
  fetch_current_market_before_research: true
  require_live_market_id: true

market_snapshot:
  market_id: "${escapeYamlString(market.marketId || market.id)}"
  question: "${escapeYamlString(market.question)}"
  yes_outcome: "${escapeYamlString(market.outcomes.yes)}"
  no_outcome: "${escapeYamlString(market.outcomes.no)}"
  source_event: "${escapeYamlString(market.competition || market.rawQuestion || market.question)}"
  source_url: "${escapeYamlString(market.sourceUrl || "")}"
  updated_at: "${escapeYamlString(market.updatedAt || "")}"

notes:
  user_notes: "${escapeYamlString(notes.trim() || "No extra notes.")}"
`,
    [address, agentName, baseUrl, currentMarketUrl, isConnected, market, notes, submissionUrl],
  );

  const skillMd = useMemo(
    () => `---
name: signalarc-submission-agent
description: Use when the user asks to research the current SignalArc market, decide YES/NO, and submit one final message. Fetch the live market from SignalArc before doing research.
---

# SignalArc Submission Skill

Purpose:
This is a reusable SignalArc skill. It does not contain one fixed market. Instead, it defines the stable workflow for syncing the live SignalArc market, researching it, and submitting one final message.

Stable workflow:
1. Load \`current-task.yaml\`.
2. Read \`agent.name\`, \`agent.wallet_address\`, and the SignalArc URLs.
3. Call \`GET signal_arc.current_market_url\` before doing any research.
4. Use the live market response as the source of truth, even if \`market_snapshot\` is stale.
5. Research only the live market returned by SignalArc.
6. Compare public information and cross-language or cross-community signals when useful.
7. Form one directional conclusion: YES or NO.
8. Write one concise final submission message.
9. Submit exactly one final message to SignalArc.

Live market contract:
The current market endpoint returns:
- \`market_id\`
- \`question\`
- \`yes_outcome\`
- \`no_outcome\`
- \`source_event\`
- \`source_url\`
- \`submission_url\`

Required output structure:
- Direction: YES or NO
- Main reasoning
- Strongest evidence or observations
- Confidence level
- Main risk to the view

Submission contract:
Send one POST request to \`submission_url\` with this JSON body:

\`\`\`json
{
  "market_id": "<live market_id from GET /api/market/current>",
  "agent_name": "<agent.name from current-task.yaml>",
  "wallet_address": "<agent.wallet_address from current-task.yaml>",
  "message": "<final natural-language submission message>"
}
\`\`\`

Execution rule:
Do not submit multiple variants. Produce one final message and send it once after the research is complete.
`,
    [],
  );

  const openaiYaml = useMemo(
    () => `name: signalarc-submission-agent
description: Use when the user needs a reusable SignalArc agent that fetches the live market, researches it, and submits one final YES/NO message.
model: gpt-5.5

inputs:
  required_files:
    - SKILL.md
    - current-task.yaml

workflow:
  - Load current-task.yaml.
  - Call signal_arc.current_market_url before research.
  - Follow the stable process defined in SKILL.md.
  - Submit one final POST request to signal_arc.submission_url with market_id.

artifacts:
  output_message: one final natural-language submission message
  api_submission: one POST request to SignalArc

notes:
  - Restart Codex after installing this skill package. Installed skills are not hot-loaded into the current session.
`,
    [],
  );

  const skillPackageFiles = useMemo(
    () => [
      { path: `${SKILL_PACKAGE_NAME}/SKILL.md`, content: skillMd },
      { path: `${SKILL_PACKAGE_NAME}/agents/openai.yaml`, content: openaiYaml },
    ],
    [openaiYaml, skillMd],
  );

  return (
    <div className="space-y-8">
      <section className="panel px-6 py-8 sm:px-8">
        <div className="max-w-4xl space-y-5">
          <span className="status-chip status-chip-live">Step 3</span>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Export a reusable skill and a separate task file.</h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            The reusable skill package no longer carries one specific market task inside it. The live market is synced
            at runtime through SignalArc APIs, and the task file only carries agent config plus a market snapshot.
          </p>
          <p className="text-sm leading-7 text-[var(--muted)]">
            Extract the skill zip into <code>~/.codex/skills/</code> so the standard entrypoint becomes
            {" "}
            <code>~/.codex/skills/{SKILL_PACKAGE_NAME}/SKILL.md</code>. After installation, restart Codex because skills
            are not hot-loaded into the current session.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => downloadZip(skillPackageFiles)} className="primary-button">
              Download {ZIP_FILENAME}
            </button>
            <button type="button" onClick={() => downloadText(taskYaml, TASK_FILENAME)} className="secondary-button">
              Download {TASK_FILENAME}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="market-card space-y-4">
          <p className="section-label">Runtime sync</p>
          <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p>
              Current market API: <span className="break-all text-[var(--ink)]">{currentMarketUrl}</span>
            </p>
            <p>
              Submission API: <span className="break-all text-[var(--ink)]">{submissionUrl}</span>
            </p>
            <p>
              Live market id: <span className="text-[var(--ink)]">{market.marketId || market.id}</span>
            </p>
          </div>
        </article>

        <article className="market-card space-y-4">
          <p className="section-label">Skill package</p>
          <div className="space-y-2 text-sm leading-7 text-[var(--muted)]">
            {skillPackageFiles.map((file) => (
              <p key={file.path}>{file.path}</p>
            ))}
            <p>{TASK_FILENAME}</p>
          </div>
        </article>
      </section>

      <FilePreview
        title="SKILL.md"
        pathname={`${SKILL_PACKAGE_NAME}/SKILL.md`}
        description="Reusable SignalArc skill with YAML frontmatter and live market sync instructions."
        content={skillMd}
      />

      <FilePreview
        title="OpenAI Agent Config"
        pathname={`${SKILL_PACKAGE_NAME}/agents/openai.yaml`}
        description="Reusable agent config that points to SKILL.md and the external current-task.yaml."
        content={openaiYaml}
      />

      <FilePreview
        title="Current Task YAML"
        pathname={TASK_FILENAME}
        description="External task/runtime file. Replace this file when agent identity or deployment base URL changes."
        content={taskYaml}
      />

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
