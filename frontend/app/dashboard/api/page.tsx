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
            <h1 className="text-2xl font-bold text-white tracking-tight">API Reverse Proxies</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {proxies.length} Registered
            </span>
          </div>
          <p className="text-sm text-white/50 mt-1">
            Map custom tenant subdomains to upstream target APIs with dynamic zero-trust proxying.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadProxies()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-blue-400" : ""} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setIsAdding(!isAdding);
              setFormError("");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium text-sm shadow-lg shadow-blue-500/20 hover:opacity-95 transition-all"
          >
            {isAdding ? <X size={18} /> : <Plus size={18} />}
            <span>{isAdding ? "Cancel" : "Register Subdomain"}</span>
          </button>
        </div>
      </div>

      {/* Add Subdomain Form */}
      {isAdding && (
        <form
          onSubmit={handleAddApi}
          className="p-6 rounded-2xl bg-[#0a0e1a]/90 border border-blue-500/20 backdrop-blur-xl shadow-2xl space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Waypoints className="text-blue-400" size={20} />
              Register New Upstream API Subdomain
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {(formError || submitError) && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{formError || submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Display Name / Service Label</label>
              <input
                type="text"
                placeholder="e.g. Billing Service"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Subdomain Host Key *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. qroasis"
                  value={subdomain}
                  onChange={(e) => setSubdomain(slugify(e.target.value))}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all pr-28"
                />
                <span className="absolute right-3 top-2.5 text-xs text-white/30 font-mono">
                  .{PROXY_BASE_DOMAIN}
                </span>
              </div>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-white/70">Upstream Target Base URL *</label>
              <input
                type="url"
                placeholder="e.g. https://my-deployment.vercel.app or http://upstream:8001"
                value={upstreamUrl}
                onChange={(e) => setUpstreamUrl(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              <span>{submitting ? "Registering..." : "Save Route"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Error state */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>Failed to load proxy routes: {fetchError}</span>
          </div>
          <button
            onClick={() => void loadProxies()}
            className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-medium transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && proxies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-white/40 font-medium">Loading reverse proxy routes...</p>
        </div>
      )}

      {/* Proxy Grid */}
      {!loading && proxies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-[#0a0e1a]/60 border border-white/5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
            <Globe size={24} />
          </div>
          <h3 className="text-base font-semibold text-white">No Proxy Subdomains Registered</h3>
          <p className="text-xs text-white/40 max-w-md mt-1 mb-4">
            Register your first upstream API subdomain to route requests through the SENTRA zero-trust security proxy.
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition-all"
          >
            <Plus size={16} />
            <span>Register Subdomain</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proxies.map((proxy) => {
            const gatewayUrl = proxyUrlFor(proxy.subdomain);

            return (
              <div
                key={proxy.id || proxy.subdomain}
                className="p-5 rounded-2xl bg-[#0a0e1a]/80 border border-white/5 hover:border-blue-500/30 transition-all group backdrop-blur-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">
                        {proxy.subdomain.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm capitalize">
                          {proxy.subdomain} Subdomain
                        </h4>
                        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active Shield Proxy
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard(proxy.id || proxy.subdomain, gatewayUrl)}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                      title="Copy Proxy URL"
                    >
                      {copiedId === (proxy.id || proxy.subdomain) ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5 text-xs font-mono">
                    <div>
                      <span className="text-[10px] uppercase text-white/40 font-sans tracking-wider block mb-0.5">
                        Gateway Ingress Host
                      </span>
                      <a
                        href={gatewayUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline truncate block"
                      >
                        {gatewayUrl}
                      </a>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-white/40 font-sans tracking-wider block mb-0.5">
                        Upstream Destination Target
                      </span>
                      <span className="text-white/70 truncate block">{proxy.api_base_url}</span>
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