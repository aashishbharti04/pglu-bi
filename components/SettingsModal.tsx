"use client";

import { useEffect, useState } from "react";
import { getApiKey, setApiKey } from "@/lib/clientStore";
import { useTheme, type ThemeMode } from "@/lib/useDarkMode";

const MODES: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "◐ Auto" },
  { value: "light", label: "☀ Light" },
  { value: "dark", label: "● Dark" },
];

export default function SettingsModal({
  open,
  onClose,
  onKeyChange,
}: {
  open: boolean;
  onClose: () => void;
  onKeyChange?: (saved: boolean) => void;
}) {
  const { mode, setMode } = useTheme();
  const [keyInput, setKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    if (open) setKeySaved(Boolean(getApiKey()));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <section className="settings-group">
          <div className="card-title">Anthropic API key</div>
          {keySaved ? (
            <p className="muted key-row">
              AI features enabled — key stored in this browser only.{" "}
              <button
                className="link-btn"
                onClick={() => {
                  setApiKey("");
                  setKeySaved(false);
                  onKeyChange?.(false);
                }}
              >
                Remove key
              </button>
            </p>
          ) : (
            <>
              <p className="muted">
                Optional. Enables AI-designed dashboards, insights, and chat
                editing. The key is stored only in your browser and sent only
                to Anthropic.
              </p>
              <form
                className="key-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (keyInput.trim()) {
                    setApiKey(keyInput);
                    setKeyInput("");
                    setKeySaved(true);
                    onKeyChange?.(true);
                  }
                }}
              >
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-ant-…"
                  autoFocus
                />
                <button type="submit" disabled={!keyInput.trim()}>
                  Save
                </button>
              </form>
            </>
          )}
        </section>

        <section className="settings-group">
          <div className="card-title">Theme</div>
          <div className="theme-options">
            {MODES.map((m) => (
              <button
                key={m.value}
                className={`theme-option ${mode === m.value ? "selected" : ""}`}
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </section>

        <section className="settings-group">
          <div className="card-title">Local data</div>
          <p className="muted">
            Datasets, dashboards, and the API key live in this browser&apos;s
            storage only.
          </p>
          <button
            className="danger-btn"
            onClick={() => {
              if (!confirm("Delete all dashboards, datasets, and the API key from this browser?"))
                return;
              for (const k of Object.keys(localStorage)) {
                if (k.startsWith("pglu:")) localStorage.removeItem(k);
              }
              onKeyChange?.(false);
              onClose();
              window.location.reload();
            }}
          >
            Delete all local data
          </button>
        </section>
      </div>
    </div>
  );
}
