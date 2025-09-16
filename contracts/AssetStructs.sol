// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AssetStructs
 * @notice Define estructuras y enumeraciones utilizadas por FractalLandRegistry.
 */
library AssetStructs {
    enum AssetStatus {
        PENDIENTE,
        ACTIVO,
        TRANSFERIDO,
        BLOQUEADO,
        FINALIZADO
    }

    struct Asset {
        uint256 id;
        bytes32 certificateHash;
        address currentOwner;
        AssetStatus status;
    }

    struct Modification {
        AssetStatus status;
        uint256 timestamp;
        address updatedBy;
    }
}
