import logging
from typing import Dict, Optional

from narrative_memory.story_ledger import StoryLedger

from .pow_engine import PoWEngine
from .poa_validator import PoAValidator
from .bft_protocol import BFTProtocol
from .symbolic_consensus import SymbolicConsensus


class ConsensusController:
    """Controller to switch between consensus mechanisms."""

    def __init__(
        self,
        mode: str = "pow",
        pow_engine: Optional[PoWEngine] = None,
        poa_validator: Optional[PoAValidator] = None,
        bft_protocol: Optional[BFTProtocol] = None,
        symbolic: Optional[SymbolicConsensus] = None,
        ledger: Optional[StoryLedger] = None,
    ) -> None:
        self.mode = mode
        self.pow_engine = pow_engine or PoWEngine()
        self.poa_validator = poa_validator
        self.bft_protocol = bft_protocol
        self.symbolic = symbolic
        self.ledger = ledger
        self.logger = logging.getLogger(self.__class__.__name__)

    def switch_mode(self, mode: str) -> None:
        self.logger.info("Switch consensus mode to %s", mode)
        self.mode = mode

    def audit(self, message: str) -> None:
        if self.ledger:
            self.ledger.log_action("consensus", message)

    def process_block(self, block, signatures: Optional[Dict[str, bytes]] = None, ritual: str | None = None) -> bool:
        """Validate or mine a block depending on active mode."""
        if self.mode == "pow":
            self.pow_engine.mine(block)
            valid = self.pow_engine.verify(block)
        elif self.mode == "poa":
            if not self.poa_validator:
                raise RuntimeError("PoA validator not configured")
            valid = self.poa_validator.verify_block(block, signatures or {})
        elif self.mode == "bft":
            if not self.bft_protocol:
                raise RuntimeError("BFT protocol not configured")
            valid = self.bft_protocol.verify_block(block, signatures or {})
        elif self.mode == "symbolic":
            if not self.symbolic:
                raise RuntimeError("Symbolic consensus not configured")
            valid = self.symbolic.verify(ritual or "")
        else:
            raise ValueError(f"Unknown consensus mode {self.mode}")
        self.audit(f"Processed block {getattr(block, 'index', '?')} -> {valid}")
        return valid
