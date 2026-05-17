"use client";

import { useState } from "react";

export default function CopyButton({ text, label = "Copy", copiedLabel = "Copied", className = "secondary-button" }) {
  const [status, setStatus] = useState("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1600);
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {status === "copied" ? copiedLabel : status === "error" ? "Copy failed" : label}
    </button>
  );
}
