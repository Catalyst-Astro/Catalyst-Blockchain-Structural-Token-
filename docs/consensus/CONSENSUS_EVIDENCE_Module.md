# CONSENSUS_EVIDENCE Module

- Contract: `ConsensusEvidence` records hashes proving how a subject (block/batch/EID/RID) reached consensus.
- Fields stored: `mode` (POW/POA/BFT/OTHER), `quorumHash` (policy/quorum manifest hash), `signersHash` (hash/Merkle root of signers), recorder, recordedAt.
- Roles: `AUDITOR` or `COMPLIANCE_ADMIN` can record; one record per `subjectId` (immutable).
- Use with off-chain manifest: build deterministic manifest, hash it, call `recordEvidence`.
- Typical `subjectId`: block hash, batchId, event EID, report RID.
