# Boo Systems — Custom Exceptions

class BooException(Exception):
    """Base exception for Boo Systems."""
    pass

class HybrisTriggered(BooException):
    """Raised when Hybrys threshold is exceeded. Forces dialectical reset."""
    def __init__(self, confidence, reward, threshold):
        self.confidence = confidence
        self.reward = reward
        self.threshold = threshold
        super().__init__(
            f"HYBRYS TRIGGERED: confidence={confidence:.2f} > {threshold}, "
            f"reward={reward:.2f}. RESET required."
        )

class InvalidPhaseTransition(BooException):
    """Raised when attempting invalid Pentetraktys phase transition."""
    pass

class BlockMemoryError(BooException):
    """Raised when block memory operations fail."""
    pass

class SynthesisFailed(BooException):
    """Raised when the Boo orchestrator simulation rejects a synthesis."""
    def __init__(self, thesis_id, antithesis_id, simulation_result):
        self.thesis_id = thesis_id
        self.antithesis_id = antithesis_id
        self.simulation_result = simulation_result
        super().__init__(f"Synthesis failed: simulation rejected the merge.")
