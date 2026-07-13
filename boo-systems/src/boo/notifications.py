#!/usr/bin/env python3
"""
Boo Notifications — System Alerts & Messaging (#031)
══════════════════════════════════════════════════════
BELL 13450.50 | Structured notifications for Hybrys events,
validation failures, milestones, and system status.
"""

from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Callable


class NotificationLevel(Enum):
    DEBUG = 0
    INFO = 1
    SUCCESS = 2
    WARNING = 3
    HYBRYS = 4
    ERROR = 5
    CRITICAL = 6


@dataclass
class Notification:
    """A single notification."""
    level: NotificationLevel
    title: str
    message: str
    context: Dict = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    acknowledged: bool = False
    action_required: bool = False
    suggested_action: str = ""

    @property
    def icon(self) -> str:
        icons = {
            NotificationLevel.DEBUG: "🔍",
            NotificationLevel.INFO: "ℹ️",
            NotificationLevel.SUCCESS: "✅",
            NotificationLevel.WARNING: "⚠️",
            NotificationLevel.HYBRYS: "🚨",
            NotificationLevel.ERROR: "❌",
            NotificationLevel.CRITICAL: "💀",
        }
        return icons.get(self.level, "📌")

    def format(self) -> str:
        return f"{self.icon} [{self.level.name}] {self.title}: {self.message}"


class NotificationSystem:
    """Central notification dispatcher."""

    def __init__(self):
        self.notifications: List[Notification] = []
        self.subscribers: Dict[NotificationLevel, List[Callable]] = {
            level: [] for level in NotificationLevel
        }
        self.milestones: List[Dict] = []
        self.hybrys_count = 0
        self.error_count = 0

    def notify(self, level: NotificationLevel, title: str, message: str,
               context: Dict = None, action: str = "") -> Notification:
        """Send a notification."""
        notif = Notification(
            level=level, title=title, message=message,
            context=context or {}, action_required=bool(action),
            suggested_action=action,
        )
        self.notifications.append(notif)

        if level == NotificationLevel.HYBRYS:
            self.hybrys_count += 1
        elif level in (NotificationLevel.ERROR, NotificationLevel.CRITICAL):
            self.error_count += 1

        # Dispatch to subscribers
        for callback in self.subscribers.get(level, []):
            try:
                callback(notif)
            except Exception:
                pass

        return notif

    def notify_hybrys(self, confidence: float, reward: float,
                       lesson: str = "") -> Notification:
        """Special Hybrys alert."""
        return self.notify(
            NotificationLevel.HYBRYS,
            "HYBRYS DETECTED",
            f"Confidence={confidence:.1f}, Reward={reward:.1f}. {lesson}",
            context={"confidence": confidence, "reward": reward},
            action="RESET required: !reset <lección aprendida>",
        )

    def notify_validation_failure(self, synthesis: str,
                                   simulation_result: Dict) -> Notification:
        """Synthesis rejected by simulation."""
        return self.notify(
            NotificationLevel.WARNING,
            "VALIDATION FAILED",
            f"Synthesis '{synthesis[:80]}...' rejected by simulation. "
            f"Autopoietic integrity: {simulation_result.get('autopoietic_integrity', '?')}",
            context={"synthesis": synthesis, "simulation": simulation_result},
            action="Antithesis auto-generated. Review and iterate.",
        )

    def notify_milestone(self, name: str, data: Dict = None) -> Notification:
        """Record a milestone achievement."""
        self.milestones.append({
            "name": name, "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        return self.notify(
            NotificationLevel.SUCCESS,
            f"MILESTONE: {name}",
            f"Achieved: {name}",
            context=data or {},
        )

    def subscribe(self, level: NotificationLevel, callback: Callable):
        """Subscribe to notifications of a given level."""
        self.subscribers[level].append(callback)

    def recent(self, limit: int = 10, min_level: NotificationLevel = None) -> List[Notification]:
        """Get recent notifications, optionally filtered by minimum level."""
        notifications = self.notifications[-limit:]
        if min_level:
            notifications = [n for n in notifications if n.level.value >= min_level.value]
        return notifications

    def summary(self) -> Dict:
        """Summary of notification activity."""
        return {
            "total": len(self.notifications),
            "hybrys_events": self.hybrys_count,
            "errors": self.error_count,
            "milestones": len(self.milestones),
            "recent": [n.format() for n in self.recent(5)],
        }

    def unacknowledged(self) -> List[Notification]:
        """Get all unacknowledged notifications."""
        return [n for n in self.notifications if not n.acknowledged]

    def acknowledge_all(self):
        """Mark all notifications as acknowledged."""
        for n in self.notifications:
            n.acknowledged = True
