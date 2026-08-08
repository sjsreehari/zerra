"use client";

import { useEffect, useState, useCallback } from "react";
import { APIENDPOINT } from "@/config/Backend";
import { useApiCall } from "@/hooks/useApiCall";
import {
  Plus,
  Copy,
  Check,
  Globe,
  X,
  Waypoints,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

type ProxyRoute = {
  id: string;
  subdomain: string;
  api_base_url: string;
};

const PROXY_BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "127.0.0.1:8080";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function proxyUrlFor(subdomain: string) {
  return `http://${subdomain}.${PROXY_BASE_DOMAIN}`;
}

export default function ApisPage() {
  const { data: proxiesData, loading, error: fetchError, execute: fetchProxies } = useApiCall<ProxyRoute[]>();
  const { loading: submitting, error: submitError, execute: createProxy } = useApiCall<ProxyRoute>();

  const [proxies, setProxies] = useState<ProxyRoute[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [upstreamUrl, setUpstreamUrl] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [formError, setFormError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadProxies = useCallback(async () => {
    const result = await fetchProxies(APIENDPOINT.Proxy);
    if (Array.isArray(result)) {
      setProxies(result);
    }
  }, [fetchProxies]);

  useEffect(() => {
    void loadProxies();
  }, [loadProxies]);

  useEffect(() => {
    if (Array.isArray(proxiesData)) {
      setProxies(proxiesData);
    }
  }, [proxiesData]);

  function resetForm() {
    setName("");
    setUpstreamUrl("");
    setSubdomain("");
    setFormError("");
  }

  function handleNameChange(value: string) {
    setName(value);
    setSubdomain((prev) => (prev === "" || prev === slugify(name) ? slugify(value) : prev));
  }

  async function handleAddApi(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!upstreamUrl.trim() || !subdomain.trim()) {
      setFormError("Subdomain and Upstream API URL are required.");
      return;
    }

    try {
      const parsed = new URL(upstreamUrl);
      if (!parsed.protocol.startsWith("http")) throw new Error();
    } catch {
      setFormError("Enter a valid URL starting with http:// or https://.");
      return;
    }

    const cleanSubdomain = slugify(subdomain);
    if (proxies.some((p) => p.subdomain.toLowerCase() === cleanSubdomain.toLowerCase())) {
      setFormError("That subdomain is already registered. Pick another.");
      return;
    }

    const res = await createProxy(APIENDPOINT.Proxy, {
      method: "POST",
      body: JSON.stringify({
        subdomain: cleanSubdomain,
        api_base_url: upstreamUrl.trim(),
      }),
    });

    if (res) {
      resetForm();
      setIsAdding(false);
      await loadProxies();
    }
  }

  function copyToClipboard(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">API Reverse Proxies</h1>
            <span className="badge badge-info">{proxies.length} Registered</span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Map custom tenant subdomains to upstream target APIs with dynamic zero-trust proxying.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadProxies()}
            disabled={loading}
            className="btn btn-ghost"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-color-accent" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setFormError("");
            }}
            className="btn btn-primary"
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            <span>{isAdding ? "Cancel" : "Register Subdomain"}</span>
          </button>
        </div>
      </div>

      {/* Add Subdomain Form */}
      {isAdding && (
        <form onSubmit={handleAddApi} className="card space-y-5">
          <div className="flex items-center justify-between border-b border-border-default pb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Waypoints className="text-color-accent" size={20} />
              Register New Upstream API Subdomain
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {(formError || submitError) && (
            <div className="status-bg-danger p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{formError || submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Display Name / Service Label</label>
              <input
                type="text"
                placeholder="e.g. Billing Service"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input w-full"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Subdomain Host Key *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. qroasis"
                  value={subdomain}
                  onChange={(e) => setSubdomain(slugify(e.target.value))}
                  required
                  className="input w-full pr-28"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-mono">
                  .{PROXY_BASE_DOMAIN}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Upstream Target Base URL *</label>
              <input
                type="url"
                placeholder="e.g. https://my-deployment.vercel.app or http://upstream:8001"
                value={upstreamUrl}
                onChange={(e) => setUpstreamUrl(e.target.value)}
                required
                className="input w-full font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              <span>{submitting ? "Registering..." : "Save Route"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Error state */}
      {fetchError && (
        <div className="status-bg-danger p-4 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>Failed to load proxy routes: {fetchError}</span>
          </div>
          <button onClick={() => void loadProxies()} className="btn btn-danger !py-1 !px-3 text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && proxies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-border-default border-t-color-accent rounded-full animate-spin" />
          <p className="text-sm text-text-muted font-medium">Loading reverse proxy routes...</p>
        </div>
      )}

      {/* Proxy Grid */}
      {!loading && proxies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-bg-surface-sunken border border-border-default text-center">
          <div className="w-12 h-12 rounded-2xl bg-info-bg border border-info-border flex items-center justify-center text-info-text mb-3">
            <Globe size={24} />
          </div>
          <h3 className="text-base font-semibold text-text-primary">No Proxy Subdomains Registered</h3>
          <p className="text-xs text-text-muted max-w-md mt-1 mb-4">
            Register your first upstream API subdomain to route requests through the zero-trust security proxy.
          </p>
          <button onClick={() => setIsAdding(true)} className="btn btn-secondary">
            <Plus size={16} />
            <span>Register Subdomain</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proxies.map((proxy) => {
            const gatewayUrl = proxyUrlFor(proxy.subdomain);

            return (
              <div key={proxy.id || proxy.subdomain} className="card flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-info-bg border border-info-border flex items-center justify-center text-info-text font-bold text-sm">
                        {proxy.subdomain.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-text-primary text-sm capitalize">
                          {proxy.subdomain} Subdomain
                        </h4>
                        <span className="inline-flex items-center gap-1.5 text-[10px] status-text-success mt-0.5">
                          <span className="dot dot-success animate-pulse" />
                          Active Shield Proxy
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(proxy.id || proxy.subdomain, gatewayUrl)}
                      className="btn btn-ghost !p-2"
                      title="Copy Proxy URL"
                    >
                      {copiedId === (proxy.id || proxy.subdomain) ? (
                        <Check size={14} className="status-text-success" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border-default text-xs font-mono">
                    <div>
                      <span className="text-[10px] uppercase text-text-muted font-sans tracking-wider block mb-0.5">
                        Gateway Ingress Host
                      </span>
                      <a
                        href={gatewayUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link hover:underline truncate block"
                      >
                        {gatewayUrl}
                      </a>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-text-muted font-sans tracking-wider block mb-0.5">
                        Upstream Destination Target
                      </span>
                      <span className="text-text-secondary truncate block">{proxy.api_base_url}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}