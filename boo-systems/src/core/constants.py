# Boo Systems — Physical, Logical, and Cognitive Constants
# BELL 13450.50 | Pentetraktys 4D | OSHIRO ERC-26+

from enum import Enum

# ── Pentetraktys Phases ──
class PentetraktysPhase(Enum):
    THESIS = "tesis"
    ANTITHESIS = "antitesis"
    SYNTHESIS = "sintesis"
    CONCLUSION = "conclusion"
    HYBRYS = "hybrys"
    RESET = "reset"

# ── Cognitive Pillars ──
class CognitivePillar(Enum):
    TOP_DOWN = "td_cardinal"     # P1: Rules, anchors, fixed maps
    BOTTOM_UP = "bu_ordinal"     # P2: Evidence, steps, raw data
    FORWARD = "forward_action"    # P3: Time projection, next actions
    REWARD = "reward_score"       # P4: Validation, feedback, Hybrys detection

# ── Hybrys Thresholds ──
HYBRYS_CONFIDENCE_HIGH = 0.8    # Confidence > 80% = potential Hybrys
HYBRYS_REWARD_LOW = 0.4         # Reward < 40% = validation failure
HYBRYS_TRIGGER = 0.15           # Combined Hybrys > 15% = WARNING
HYBRYS_CRITICAL = 0.30          # Combined Hybrys > 30% = CRITICAL → FORCE RESET

# ── Block Memory ──
BLOCK_VERSION = "1.0"
BLOCK_FORMAT = "json"
MAX_BLOCK_SIZE = 1_000_000  # 1MB per block

# ── Physical Constants (Boo Compiler) ──
PLANCK_LENGTH = 1.616255e-35      # meters
PLANCK_TIME = 5.391247e-44        # seconds
HUBBLE_CONSTANT = 2.27e-18        # s^-1 (~70 km/s/Mpc)
VACUUM_ENERGY_DENSITY = 5.96e-10  # J/m^3 (observed)
CASIMIR_FORCE_BASELINE = 1.3e-3   # N/m^2 at 1μm separation
SPEED_OF_LIGHT = 299792458         # m/s

# ── Biological Constants (Autopoiesis) ──
CELL_DEFAULT_RADIUS = 10e-6       # 10 μm
PROTEIN_FOLDING_ENERGY = 20.0     # kT units
ATP_SYNTHASE_RATE = 100           # molecules/second
AUTOPOIETIC_THRESHOLD = 0.73      # Minimum autopoietic integrity
