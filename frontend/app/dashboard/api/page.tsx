"use client"

import { useState } from "react";
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Globe,
  X,
  Waypoints,
  ShieldCheck,
} from "lucide-react";

type ApiEntry = {
  id: string;
  name: string;
  upstreamUrl: string;
  subdomain: string;
};

const PROXY_ROOT = "zerra.app";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function proxyUrlFor(subdomain: string) {
  return `https://${subdomain}.${PROXY_ROOT}`;
}

export default function ApisPage() {
  const [apis, setApis] = useState<ApiEntry[]>([
    {
      id: "seed-1",
      name: "Billing Service",
      upstreamUrl: "https://billing-internal.acme.com",
      subdomain: "billing",
    },
  ]);

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [upstreamUrl, setUpstreamUrl] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setUpstreamUrl("");
    setSubdomain("");
    setError("");
  }

  function handleNameChange(value: string) {
    setName(value);
    setSubdomain((prev) => (prev === "" || prev === slugify(name) ? slugify(value) : prev));
  }

  function handleAddApi(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !upstreamUrl.trim() || !subdomain.trim()) {
      setError("Fill in every field before adding an API.");
      return;
    }

    try {
      const parsed = new URL(upstreamUrl);
      if (!parsed.protocol.startsWith("http")) throw new Error();
    } catch {
      setError("Enter a valid URL, including https://.");
      return;
    }

    const cleanSubdomain = slugify(subdomain);
    if (apis.some((api) => api.subdomain === cleanSubdomain)) {
      setError("That subdomain is already in use. Pick another.");
      return;
    }

    const entry: ApiEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      upstreamUrl: upstreamUrl.trim(),
      subdomain: cleanSubdomain,
    };

    setApis((prev) => [entry, ...prev]);
    resetForm();
    setIsAdding(false);
  }

  function handleRemove(id: string) {
    setApis((prev) => prev.filter((api) => api.id !== id));
  }

  async function handleCopy(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
    } catch {
      // Clipboard permission denied or unavailable; fail silently.
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">APIs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register an upstream API and get a protected proxy URL to use in its place.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding((prev) => !prev)}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          {isAdding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isAdding ? "Cancel" : "Add API"}
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddApi}
          className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600" htmlFor="api-name">
                API name
              </label>
              <input
                id="api-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Billing Service"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600" htmlFor="api-subdomain">
                Proxy subdomain
              </label>
              <div className="flex items-center rounded-lg border border-slate-300 px-3 py-2 text-sm focus-within:border-slate-500">
                <input
                  id="api-subdomain"
                  value={subdomain}
                  onChange={(e) => setSubdomain(slugify(e.target.value))}
                  placeholder="billing"
                  className="w-full text-slate-900 outline-none"
                />
                <span className="whitespace-nowrap text-slate-400">.{PROXY_ROOT}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600" htmlFor="api-upstream">
              Upstream base URL
            </label>
            <input
              id="api-upstream"
              value={upstreamUrl}
              onChange={(e) => setUpstreamUrl(e.target.value)}
              placeholder="https://billing-internal.acme.com"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <p className="text-xs text-slate-400">
              Requests to your proxy URL are forwarded here after passing inspection.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsAdding(false);
              }}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add API
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {apis.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <Waypoints className="h-6 w-6 text-slate-300" />
            <p className="text-sm text-slate-500">No APIs registered yet. Add one to generate a proxy URL.</p>
          </div>
        )}

        {apis.map((api) => {
          const proxyUrl = proxyUrlFor(api.subdomain);
          const isCopied = copiedId === api.id;

          return (
            <div
              key={api.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{api.name}</p>
                  <p className="text-xs text-slate-400">{api.upstreamUrl}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:pl-4">
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-700">{proxyUrl}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(api.id, proxyUrl)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100"
                  aria-label="Copy proxy URL"
                >
                  {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleRemove(api.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove API"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}