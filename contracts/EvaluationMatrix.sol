// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library EvaluationMatrix {
    struct Metrics {
        uint256 proposalsApproved;
        uint256 proposalsRejected;
        uint256 cyclesExecuted;
        uint256 daoActivity;
        uint256 subsidiesReleased;
        uint256 custodianInterventions;
        uint256 walletParticipation;
    }

    struct CoherenceInput {
        uint256 principles;
        uint256 resonance;
        uint256 externalActivity;
    }

    function evaluate(Metrics memory m, CoherenceInput memory c)
        internal
        pure
        returns (uint256 healthScore, uint256 resonanceIndex, bool fracture)
    {
        healthScore =
            m.proposalsApproved +
            m.daoActivity +
            m.walletParticipation +
            c.principles +
            c.externalActivity;
        resonanceIndex = c.resonance;
        fracture = m.proposalsRejected > m.proposalsApproved;
    }
}

