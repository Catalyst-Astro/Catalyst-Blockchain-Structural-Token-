"""Example simulation of multiple consensus modes."""
import logging
from simplechain.blockchain import Blockchain
from catalyst.crypto.signatures import ECDSAKeyPair
from narrative_memory.story_ledger import StoryLedger

from consensus.pow_engine import PoWEngine
from consensus.poa_validator import PoAValidator
from consensus.bft_protocol import BFTProtocol
from consensus.consensus_controller import ConsensusController
from consensus.symbolic_consensus import SymbolicConsensus


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    bc = Blockchain(difficulty=3)
    ledger = StoryLedger("consensus_story.jsonl")

    # -- Proof of Work mode
    controller = ConsensusController(mode="pow", pow_engine=PoWEngine(3), ledger=ledger)
    block = bc.new_block()
    controller.process_block(block)

    # -- Switch to PoA mode
    v1 = ECDSAKeyPair.generate()
    validator = PoAValidator({"val1": v1})
    controller.switch_mode("poa")
    controller.poa_validator = validator
    sig = {"val1": validator.sign_block("val1", block)}
    controller.process_block(block, signatures=sig)

    # -- Switch to BFT mode with three validators
    v2 = ECDSAKeyPair.generate()
    v3 = ECDSAKeyPair.generate()
    bft = BFTProtocol({"v1": v1, "v2": v2, "v3": v3})
    controller.switch_mode("bft")
    controller.bft_protocol = bft
    sigs = {
        "v1": bft.sign_block("v1", block),
        "v2": bft.sign_block("v2", block),
    }
    controller.process_block(block, signatures=sigs)

    # -- Symbolic consensus
    symbolic = SymbolicConsensus("open-sesame")
    controller.switch_mode("symbolic")
    controller.symbolic = symbolic
    controller.process_block(block, ritual="open-sesame")

    print("Ledger entries:")
    for story in ledger.stories():
        print(story)


if __name__ == "__main__":
    main()
