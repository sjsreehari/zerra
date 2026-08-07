"""All Sequence Intent Transformer v1 tuning lives here."""

WINDOW_SIZE = 10
WINDOW_TTL_SECONDS = 30 * 60
SCANNING_MIN_DISTINCT_OBJECTS = 5
READ_HEAVY_RATIO = 0.70
SHRINKING_GAP_RATIO = 0.80
EXPORT_RESPONSE_FIELD_COUNT = 5
CREDENTIAL_FAILURES = 3
SENSITIVE_FIELDS = frozenset({"ssn", "salary", "password", "token", "secret", "credit_card", "email"})
EXPORT_ENDPOINT_MARKERS = ("export", "bulk", "download", "archive")
USE_ML_SCORER = False
