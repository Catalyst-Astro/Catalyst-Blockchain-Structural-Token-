// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../EvaluationMatrix.sol";

interface ISelfAware {
    function evaluate(
        EvaluationMatrix.Metrics calldata metrics,
        EvaluationMatrix.CoherenceInput calldata coherence
    ) external;
}
