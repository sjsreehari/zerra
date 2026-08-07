from .config import CONSECUTIVE_CALLS_TO_CONFIRM_ZONE_EXIT, ZONE_THRESHOLDS
from .models import TrustZone, Verdict


def next_zone(current_zone: TrustZone, score: float, consecutive_calls: int) -> tuple[TrustZone, bool]:
    thresholds = ZONE_THRESHOLDS
    if current_zone == TrustZone.GREEN and score < thresholds["green_to_yellow"]:
        return TrustZone.YELLOW, True
    if current_zone == TrustZone.YELLOW:
        if score < thresholds["yellow_to_red"]:
            return TrustZone.RED, True
        if score > thresholds["yellow_to_green"] and consecutive_calls >= CONSECUTIVE_CALLS_TO_CONFIRM_ZONE_EXIT:
            return TrustZone.GREEN, True
    if current_zone == TrustZone.RED and score > thresholds["red_to_yellow"] and consecutive_calls >= CONSECUTIVE_CALLS_TO_CONFIRM_ZONE_EXIT:
        return TrustZone.YELLOW, True
    return current_zone, False


def zone_to_verdict(zone: TrustZone) -> Verdict:
    return {TrustZone.GREEN: Verdict.ALLOW, TrustZone.YELLOW: Verdict.STEP_UP, TrustZone.RED: Verdict.BLOCK}[zone]
