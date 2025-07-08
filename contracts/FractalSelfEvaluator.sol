// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EvaluationMatrix.sol";
import "./interfaces/ISelfAware.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract FractalSelfEvaluator is ISelfAware {
    using EvaluationMatrix for EvaluationMatrix.Metrics;

    struct Report {
        uint256 healthScore;
        uint256 resonanceIndex;
        bool fracture;
        string suggestions;
    }

    uint256 public cycle;
    mapping(uint256 => Report) private reports;

    event EvaluationCycleCompleted(uint256 indexed cycle, uint256 healthScore, uint256 resonanceIndex);
    event AlertFractureDetected(uint256 indexed cycle, string message);
    event HarmonyRestored(uint256 indexed cycle);

    function evaluate(
        EvaluationMatrix.Metrics calldata metrics,
        EvaluationMatrix.CoherenceInput calldata coherence
    ) external override {
        cycle += 1;
        (uint256 h, uint256 r, bool f) = EvaluationMatrix.evaluate(metrics, coherence);
        string memory sugg = _generateSuggestions(f);
        reports[cycle] = Report(h, r, f, sugg);
        emit EvaluationCycleCompleted(cycle, h, r);
        if (f) {
            emit AlertFractureDetected(cycle, "fracture detected");
        } else {
            emit HarmonyRestored(cycle);
        }
    }

    function _generateSuggestions(bool fracture) private pure returns (string memory) {
        if (fracture) {
            return "Iniciar ciclo de pausa; Revisar principio violado; Reforzar participacion en DAO";
        }
        return "Sistema en armonia";
    }

    function exportReport(uint256 id) external view returns (string memory) {
        Report storage r = reports[id];
        return string(
            abi.encodePacked(
                "{\"cycle\":", Strings.toString(id),
                ",\"health\":", Strings.toString(r.healthScore),
                ",\"resonance\":", Strings.toString(r.resonanceIndex),
                ",\"fracture\":", r.fracture ? "true" : "false",
                ",\"suggestions\":\"", r.suggestions, "\"}"
            )
        );
    }
}
