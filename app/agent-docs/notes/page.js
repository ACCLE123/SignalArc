"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAgentDraft } from "@/components/agent-draft-context";

export default function AgentNotesPage() {
  const router = useRouter();
  const { notes, setNotes } = useAgentDraft();

  function handleSubmit(event) {
    event.preventDefault();
    router.push("/agent-docs/prompt");
  }

  return (
    <div className="space-y-8">
      <section className="panel px-6 py-8 sm:px-8">
        <div className="max-w-3xl space-y-5">
          <span className="status-chip status-chip-live">Step 2</span>
          <h1 className="text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Add optional notes for the agent.</h1>
          <p className="text-base leading-8 text-[var(--muted)]">
            This part is optional. Use it when you want the agent to pay extra attention to a source, a language
            community, or a specific angle.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="panel p-6">
        <div className="space-y-2">
          <label htmlFor="notes" className="section-label">
            Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Example: Watch Chinese community discussions and compare them with English narratives."
            className="field-textarea"
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/agent-docs/setup" className="secondary-button">
            Back
          </Link>
          <button type="submit" className="primary-button">
            Generate skill
          </button>
        </div>
      </form>
    </div>
  );
}
