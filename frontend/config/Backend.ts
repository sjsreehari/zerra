const SENTRA_API = process.env.NEXT_PUBLIC_SENTRA_URL || "http://localhost:8000";
const GO_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const APIENDPOINT = {
  Health: `${SENTRA_API}/health`,
  Evaluate: `${SENTRA_API}/v1/evaluate`,
  Metrics: `${SENTRA_API}/v1/metrics`,
  RiskCards: `${SENTRA_API}/v1/risk-cards`,
  Identities: `${SENTRA_API}/v1/identities`,
  TrustScores: `${SENTRA_API}/v1/trust-scores`,
  Policies: `${SENTRA_API}/v1/policies`,
  AttackSimScenarios: `${SENTRA_API}/v1/attack-sim/scenarios`,
  AttackSimRun: `${SENTRA_API}/v1/attack-sim/run`,
  InvestigateRiskCard: (id: string) => `${SENTRA_API}/v1/risk-cards/${id}/investigate`,
  PolicyRecommendation: (id: string) => `${SENTRA_API}/v1/risk-cards/${id}/policy-recommendation`,
  ApprovePolicy: (id: string) => `${SENTRA_API}/v1/policy-recommendations/${id}/approve`,
  IncidentReport: (id: string) => `${SENTRA_API}/v1/risk-cards/${id}/report`,
  RevokeIdentity: (id: string) => `${SENTRA_API}/v1/identities/${id}/revoke`,
  RestoreIdentity: (id: string) => `${SENTRA_API}/v1/identities/${id}/restore`,
  AttackReplay: `${SENTRA_API}/v1/attack-replay`,
  Proxy: `${GO_API}/api/v1/proxy`,
  SecurityScans: `${GO_API}/api/v1/security-scans`,
  SecurityScanJob: (id: string) => `${GO_API}/api/v1/security-scans/${id}`,
  SecurityScanFindings: (id: string) => `${GO_API}/api/v1/security-scans/${id}/findings`,
  SecurityScanCancel: (id: string) => `${GO_API}/api/v1/security-scans/${id}/cancel`,
};
