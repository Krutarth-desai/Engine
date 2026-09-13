"""
AeroTwin Digital Twin - Throttle Dynamics & Transient Lag Model
===============================================================
Models engine mechanical and thermodynamic inertia during throttle transients.

Tracks:
- Previous vs Current Throttle
- Throttle Rate (% / sec)
- Effective Dynamic Throttle (first-order low-pass filter)
- Transient Operating Flag (detects rapid throttle slam / chops)
"""

from typing import Dict, Any, Optional
import math


class ThrottleTransientModel:
    """
    Simulates dynamic engine response lag during pilot throttle adjustments.
    Prevents instantaneous step-function jumps in predicted thermodynamic states.
    """

    def __init__(self, time_constant_sec: float = 1.5, rapid_rate_threshold: float = 15.0):
        self.tau = max(0.2, float(time_constant_sec))
        self.rapid_thresh = float(rapid_rate_threshold)

        self.prev_throttle: float = 75.0
        self.effective_throttle: float = 75.0
        self.throttle_rate: float = 0.0
        self.is_transient: bool = False

    def reset(self, initial_throttle: float = 75.0) -> None:
        """Resets dynamic filter state."""
        self.prev_throttle = float(initial_throttle)
        self.effective_throttle = float(initial_throttle)
        self.throttle_rate = 0.0
        self.is_transient = False

    def update(self, target_throttle: float, dt: float = 1.0) -> Dict[str, Any]:
        """
        Advances the transient lag filter over elapsed time dt (seconds).

        Args:
            target_throttle: Commanded throttle position (0 - 100%).
            dt: Elapsed time delta in seconds (typically 1.0 s).

        Returns:
            Dict containing effective_throttle, throttle_rate, and transient flag.
        """
        target = max(0.0, min(100.0, float(target_throttle)))
        dt_clamped = max(0.01, min(10.0, float(dt)))

        # 1. Compute instantaneous throttle rate of change (% / sec)
        delta_raw = target - self.prev_throttle
        self.throttle_rate = round(delta_raw / dt_clamped, 2)

        # 2. First-Order Low-Pass Filter: dy/dt = (u - y) / tau
        # Discrete exact solution: y_k = y_{k-1} + (1 - exp(-dt / tau)) * (u - y_{k-1})
        alpha = 1.0 - math.exp(-dt_clamped / self.tau)
        self.effective_throttle += alpha * (target - self.effective_throttle)
        if abs(target - self.effective_throttle) < 0.5:
            self.effective_throttle = target
        self.effective_throttle = round(max(0.0, min(100.0, self.effective_throttle)), 2)

        # 3. Detect transient phase
        error = abs(target - self.effective_throttle)
        self.is_transient = (abs(self.throttle_rate) >= self.rapid_thresh) or (error > 3.0)

        # Update historical state for next cycle
        self.prev_throttle = target

        return {
            "target_throttle": target,
            "effective_throttle": self.effective_throttle,
            "throttle_delta": round(delta_raw, 2),
            "throttle_rate": self.throttle_rate,
            "is_transient": self.is_transient
        }
