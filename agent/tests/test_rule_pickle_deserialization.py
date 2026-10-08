"""Tests for the zerra/python/unsafe-deserialization-pickle rule (issue #49).

Covers:
- positive detection for the module forms the existing pickle-load rule misses
  (`_pickle.loads` / `_pickle.load`, and `pickle.Unpickler`)
- true negatives for safe deserialization (json)
- no duplicate finding when plain `pickle.load/loads` is already reported by
  `zerra/python/pickle-load`
- the fix generator suggesting a JSON-based replacement (and not mangling
  `_pickle` into `_json`)
"""

from pathlib import Path

from agent.integrations.fix_generator import generate_fix
from agent.scanner.sast import load_all_rules, scan_file_with_rules

RULE_ID = "zerra/python/unsafe-deserialization-pickle"
EXISTING_PICKLE_RULE = "zerra/python/pickle-load"


def _scan(tmp_path: Path, source: str):
    sample = tmp_path / "sample.py"
    sample.write_text(source, encoding="utf-8")
    return scan_file_with_rules(sample, tmp_path, load_all_rules())


def test_flags_underscore_pickle_module(tmp_path):
    findings = _scan(tmp_path, "import _pickle\npayload = _pickle.loads(raw)\n")
    assert any(f.rule_id == RULE_ID for f in findings)


def test_flags_underscore_pickle_load(tmp_path):
    findings = _scan(tmp_path, "import _pickle\nobj = _pickle.load(stream)\n")
    assert any(f.rule_id == RULE_ID for f in findings)


def test_flags_pickle_unpickler(tmp_path):
    findings = _scan(tmp_path, "import pickle\nobj = pickle.Unpickler(stream).load()\n")
    assert any(f.rule_id == RULE_ID for f in findings)


def test_true_negative_for_json(tmp_path):
    findings = _scan(tmp_path, "import json\npayload = json.loads(raw)\n")
    assert not any(f.rule_id == RULE_ID for f in findings)


def test_no_duplicate_finding_for_plain_pickle_loads(tmp_path):
    findings = _scan(tmp_path, "import pickle\npayload = pickle.loads(raw)\n")
    pickle_findings = [
        f.rule_id for f in findings if f.rule_id in {RULE_ID, EXISTING_PICKLE_RULE}
    ]
    assert pickle_findings == [EXISTING_PICKLE_RULE]


def test_fix_generator_suggests_json_for_underscore_pickle(tmp_path):
    findings = _scan(tmp_path, "import _pickle\npayload = _pickle.loads(raw)\n")
    finding = next(f for f in findings if f.rule_id == RULE_ID)
    fix = generate_fix(finding)
    assert fix is not None
    assert "json.loads" in fix.fixed_code
    assert "_json" not in fix.fixed_code


def test_rule_metadata_matches_the_issue(tmp_path):
    rule = next(r for r in load_all_rules() if r.id == RULE_ID)
    assert rule.severity.value == "critical"
    assert rule.cwe_id == "CWE-502"
    assert rule.owasp_category.startswith("A08:2021")
    assert "json" in rule.fix_hint.lower()
