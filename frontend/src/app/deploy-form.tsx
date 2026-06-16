"use client";

import { useState } from "react";

type DeploymentState = "idle" | "submitting" | "polling" | "success" | "failed";
type Step = "generate" | "deploy";

interface DeploymentStatus {
  task_id: string;
  state: "pending" | "running" | "success" | "failed";
  message: string;
  log: string[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DeployForm() {
  const [step, setStep] = useState<Step>("generate");
  const [keyId, setKeyId] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [serverIp, setServerIp] = useState("");
  const [sshUser, setSshUser] = useState("root");
  const [sshPort, setSshPort] = useState(22);

  const [deployState, setDeployState] = useState<DeploymentState>("idle");
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateKey() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/keys/generate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate SSH key");
      const data = await res.json();
      setKeyId(data.key_id);
      setPublicKey(data.public_key);
      setStep("deploy");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function pollStatus(taskId: string) {
    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(`${API_URL}/api/deploy/${taskId}/status`);
        if (!res.ok) break;
        const data: DeploymentStatus = await res.json();
        setStatus(data);

        if (data.state === "success") {
          setDeployState("success");
          return;
        }
        if (data.state === "failed") {
          setDeployState("failed");
          return;
        }
      } catch {
        break;
      }
    }
    setDeployState("failed");
    setError("Polling timed out or lost connection.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setDeployState("submitting");

    const body = {
      server_ip: serverIp,
      ssh_user: sshUser,
      ssh_port: sshPort,
      key_id: keyId,
    };

    try {
      const res = await fetch(`${API_URL}/api/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Deployment request failed");
      }

      const data = await res.json();
      setDeployState("polling");
      setStatus({
        task_id: data.task_id,
        state: "pending",
        message: data.message,
        log: [],
      });

      pollStatus(data.task_id);
    } catch (err) {
      setDeployState("failed");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const isDeploying =
    deployState === "submitting" || deployState === "polling";

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 text-sm">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            step === "generate"
              ? "bg-amber-500 text-white"
              : "bg-emerald-500 text-white"
          }`}
        >
          {step === "generate" ? "1" : "\u2713"}
        </span>
        <span
          className={`font-medium ${
            step === "generate"
              ? "text-zinc-900 dark:text-zinc-50"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          Generate SSH Key
        </span>
        <div className="h-px w-8 bg-zinc-300 dark:bg-zinc-700" />
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            step === "deploy"
              ? "bg-amber-500 text-white"
              : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400"
          }`}
        >
          2
        </span>
        <span
          className={`font-medium ${
            step === "deploy"
              ? "text-zinc-900 dark:text-zinc-50"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          Deploy
        </span>
      </div>

      {/* Step 1: Generate Key */}
      {step === "generate" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Generate SSH Key
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            We generate a secure SSH keypair on our server. You&apos;ll add the
            public key to your server so we can connect securely — your private
            key never leaves our system.
          </p>
          <button
            type="button"
            onClick={handleGenerateKey}
            disabled={generating}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
          >
            {generating ? (
              <span className="inline-flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </span>
            ) : (
              "Generate SSH Key"
            )}
          </button>
        </div>
      )}

      {/* Step 2: Deploy */}
      {step === "deploy" && (
        <>
          {/* Public Key Display */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Your Public Key
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Add this key to your server&apos;s{" "}
              <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">
                ~/.ssh/authorized_keys
              </code>{" "}
              file, then fill in the server details below.
            </p>
            <div className="relative">
              <pre className="rounded-lg bg-zinc-950 p-3 pr-20 text-xs text-zinc-300 font-mono overflow-x-auto">
                {publicKey}
              </pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-2 rounded-md bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="mt-3 rounded-lg bg-white/60 p-3 dark:bg-zinc-900/60">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                ssh your-server &quot;echo &apos;{publicKey}&apos; &gt;&gt;
                ~/.ssh/authorized_keys&quot;
              </p>
            </div>
          </div>

          {/* Deploy Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Server Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="server-ip"
                    className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Server IP Address
                  </label>
                  <input
                    id="server-ip"
                    type="text"
                    required
                    placeholder="192.168.1.100"
                    value={serverIp}
                    onChange={(e) => setServerIp(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="ssh-user"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                    >
                      SSH Username
                    </label>
                    <input
                      id="ssh-user"
                      type="text"
                      required
                      value={sshUser}
                      onChange={(e) => setSshUser(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ssh-port"
                      className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                    >
                      SSH Port
                    </label>
                    <input
                      id="ssh-port"
                      type="number"
                      min={1}
                      max={65535}
                      required
                      value={sshPort}
                      onChange={(e) => setSshPort(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isDeploying}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-zinc-900"
            >
              {isDeploying ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Deploying...
                </span>
              ) : (
                "Deploy Plex Media Server"
              )}
            </button>
          </form>
        </>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {status && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            Deployment Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge state={status.state} />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {status.message}
              </span>
            </div>

            {status.log.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg bg-zinc-950 p-4">
                <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono">
                  {status.log.join("\n")}
                </pre>
              </div>
            )}

            {status.state === "success" && (
              <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/50">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  Plex is running! Access it at{" "}
                  <a
                    href={`http://${serverIp}:32400/web`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline"
                  >
                    http://{serverIp}:32400/web
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  state,
}: {
  state: "pending" | "running" | "success" | "failed";
}) {
  const styles = {
    pending: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    running: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    success:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[state]}`}
    >
      {state}
    </span>
  );
}
