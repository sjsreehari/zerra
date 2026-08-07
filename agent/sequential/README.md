# Zerra Sequence Intent Transformer

This v1 is a transparent, hand-rolled state machine rather than a trained transformer: for each human, service, AI agent, or MCP identity it retains a short in-memory window of recent API calls and detects suspicious temporal shape such as enumeration followed by harvesting and export. It returns a 0-1 sequence risk score plus numeric evidence for the Trust Score and Risk Card layers; it never makes an allow/block decision itself. Run `python -m pytest agent/sequential/tests` from the repository root.
