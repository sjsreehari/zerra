from agent.agents import Investigation
from agent.contracts import RiskCard


def render_markdown(card: RiskCard, investigation: Investigation) -> str:
    return f"# SENTRA Incident Report\n\n## Verdict\n- Identity: `{card.identity_id}`\n- Verdict: **{card.verdict.value}**\n- Confidence: {card.confidence:.0%}\n\n## Evidence\n{card.evidence}\n\n## Classification\n- OWASP: {card.owasp_tag}\n- MITRE: {card.mitre_tag}\n\n## Analyst assessment\n{investigation.incident_summary}\n\n## Recommended actions\n" + "\n".join(f"- {action}" for action in investigation.recommended_actions)
