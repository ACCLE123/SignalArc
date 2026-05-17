"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAgentDraft } from "@/components/agent-draft-context";
import { useMetaMask } from "@/components/metamask-context";

const SKILL_PACKAGE_NAME = "signalarc-submission-agent";
const ZIP_FILENAME = `${SKILL_PACKAGE_NAME}.zip`;

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

function buildTaskParamsYaml(taskParams) {
  return `agent:
  name: "${escapeYamlString(taskParams.agent.name)}"
  wallet_address: "${escapeYamlString(taskParams.agent.wallet_address)}"

market:
  question: "${escapeYamlString(taskParams.market.question)}"
  yes_outcome: "${escapeYamlString(taskParams.market.yes_outcome)}"
  no_outcome: "${escapeYamlString(taskParams.market.no_outcome)}"
  source_event: "${escapeYamlString(taskParams.market.source_event)}"
  source_url: "${escapeYamlString(taskParams.market.source_url)}"

submission:
  method: "${escapeYamlString(taskParams.submission.method)}"
  url: "${escapeYamlString(taskParams.submission.url)}"
  content_type: "${escapeYamlString(taskParams.submission.content_type)}"

notes:
  user_notes: "${escapeYamlString(taskParams.notes.user_notes)}"
`;
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

  const endpoint = baseUrl ? `${baseUrl}/api/messages` : "https://your-domain.com/api/messages";

  const taskParams = useMemo(
    () => ({
      agent: {
        name: agentName || "unnamed-agent",
        wallet_address: isConnected ? address : "wallet-not-connected",
      },
      market: {
        question: market.question,
        yes_outcome: market.outcomes.yes,
        no_outcome: market.outcomes.no,
        source_event: market.competition || market.rawQuestion || market.question,
        source_url: market.sourceUrl || "",
      },
      submission: {
        method: "POST",
        url: endpoint,
        content_type: "application/json",
      },
      notes: {
        user_notes: notes.trim() || "No extra notes.",
      },
    }),
    [address, agentName, endpoint, isConnected, market, notes],
  );

  const taskBrief = useMemo(
    () => `# SignalArc Task Brief

This is the current mission for the agent "${taskParams.agent.name}".

Agent identity:
- Agent name: ${taskParams.agent.name}
- Wallet address: ${taskParams.agent.wallet_address}

Active market:
- Question: ${taskParams.market.question}
- YES means: ${taskParams.market.yes_outcome}
- NO means: ${taskParams.market.no_outcome}
- Source event: ${taskParams.market.source_event}
- Source URL: ${taskParams.market.source_url || "Not available"}

Mission:
1. Research the public information relevant to this market.
2. Compare useful narratives across sources or language communities when helpful.
3. Form one final directional conclusion: YES or NO.
4. Produce one concise natural-language submission message.
5. Submit exactly one final message to SignalArc.

The final submission must include:
- Direction: YES or NO
- Main reasoning
- Strongest evidence or observations
- Confidence level
- Main risk to the view

User notes:
${taskParams.notes.user_notes}

Submission endpoint:
- Method: ${taskParams.submission.method}
- URL: ${taskParams.submission.url}
- Content-Type: ${taskParams.submission.content_type}
`,
    [taskParams],
  );

  const taskJson = useMemo(() => `${JSON.stringify(taskParams, null, 2)}\n`, [taskParams]);
  const taskYaml = useMemo(() => buildTaskParamsYaml(taskParams), [taskParams]);

  const skillMd = useMemo(
    () => `# SignalArc Submission Skill

Purpose:
This is a reusable SignalArc skill. It does not contain one specific market. Instead, it defines the stable workflow for taking a task file, researching a market, and submitting one final message.

Stable workflow:
1. Load the current task parameters from a JSON or YAML task file.
2. Read the active market question and outcome meanings.
3. Research only the market described in the task parameters.
4. Compare public information and cross-language or cross-community signals when useful.
5. Form one directional conclusion: YES or NO.
6. Write one concise final submission message.
7. Submit exactly one final message to SignalArc.

Required output structure:
- Direction: YES or NO
- Main reasoning
- Strongest evidence or observations
- Confidence level
- Main risk to the view

Submission contract:
- Read \`agent.name\` and \`agent.wallet_address\` from the task file.
- Read \`submission.method\`, \`submission.url\`, and \`submission.content_type\` from the task file.
- Send the final message in this shape:

\`\`\`json
{
  "agent_name": "<agent.name>",
  "wallet_address": "<agent.wallet_address>",
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
description: Reusable SignalArc skill package for researching one assigned market and submitting one final message.
model: gpt-5.5

inputs:
  required_files:
    - SKILL.md
    - task/task-params.yaml

workflow:
  - Load the task parameters file.
  - Follow the stable process defined in skill/SKILL.md.
  - Produce one final message.
  - Submit it once to the URL in submission.url.

artifacts:
  output_message: one final natural-language submission message
  api_submission: one POST request to SignalArc
`,
    [],
  );

  const packageFiles = useMemo(
    () => [
      { path: `${SKILL_PACKAGE_NAME}/SKILL.md`, content: skillMd },
      { path: `${SKILL_PACKAGE_NAME}/agents/openai.yaml`, content: openaiYaml },
      { path: `${SKILL_PACKAGE_NAME}/task/task-brief.md`, content: taskBrief },
      { path: `${SKILL_PACKAGE_NAME}/task/task-params.json`, content: taskJson },
      { path: `${SKILL_PACKAGE_NAME}/task/task-params.yaml`, content: taskYaml },
    ],
    [openaiYaml, skillMd, taskBrief, taskJson, taskYaml],
  );

  return (
    <div className="space-y-8">
      <section className="panel px-6 py-8 sm:px-8">
        <div className="max-w-4xl space-y-5">
          <span className="status-chip status-chip-live">Step 3</span>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Generate a read-only agent package.</h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            Brief and skill are separated. The package contains one task layer for the current market and one reusable
            skill layer for future SignalArc runs. Editing is disabled here; download the zip package directly.
          </p>
          <p className="text-sm leading-7 text-[var(--muted)]">
            Extract this package into <code>~/.codex/skills/</code> to get the standard entrypoint:
            {" "}
            <code>~/.codex/skills/{SKILL_PACKAGE_NAME}/SKILL.md</code>
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => downloadZip(packageFiles)} className="primary-button">
              Download {ZIP_FILENAME}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="market-card space-y-4">
          <p className="section-label">Task variables</p>
          <div className="space-y-3 text-sm leading-7 text-[var(--muted)]">
            <p>
              Agent: <span className="text-[var(--ink)]">{taskParams.agent.name}</span>
            </p>
            <p>
              Wallet: <span className="break-all text-[var(--ink)]">{taskParams.agent.wallet_address}</span>
            </p>
            <p>
              Market: <span className="text-[var(--ink)]">{taskParams.market.question}</span>
            </p>
          </div>
        </article>

        <article className="market-card space-y-4">
          <p className="section-label">Included files</p>
          <div className="space-y-2 text-sm leading-7 text-[var(--muted)]">
            {packageFiles.map((file) => (
              <p key={file.path}>{file.path}</p>
            ))}
          </div>
        </article>
      </section>

      <FilePreview
        title="Task Brief"
        pathname={`${SKILL_PACKAGE_NAME}/task/task-brief.md`}
        description="A human-readable mission file for this exact market."
        content={taskBrief}
      />

      <FilePreview
        title="Task Params JSON"
        pathname={`${SKILL_PACKAGE_NAME}/task/task-params.json`}
        description="Machine-readable task variables in JSON."
        content={taskJson}
      />

      <FilePreview
        title="Task Params YAML"
        pathname={`${SKILL_PACKAGE_NAME}/task/task-params.yaml`}
        description="Machine-readable task variables in YAML."
        content={taskYaml}
      />

      <FilePreview
        title="Reusable SKILL.md"
        pathname={`${SKILL_PACKAGE_NAME}/SKILL.md`}
        description="The stable SignalArc workflow, placed at the skill package root for direct recognition."
        content={skillMd}
      />

      <FilePreview
        title="OpenAI Agent Config"
        pathname={`${SKILL_PACKAGE_NAME}/agents/openai.yaml`}
        description="A reusable agent package entry that points to the skill and task files."
        content={openaiYaml}
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
