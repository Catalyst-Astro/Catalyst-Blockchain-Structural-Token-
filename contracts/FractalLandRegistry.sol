// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AssetStructs.sol";
import "./AccessControlLand.sol";
import "./interfaces/ILandAuditable.sol";

/**
 * @title FractalLandRegistry
 * @notice Registro descentralizado de activos para uso legal, notarial y cooperativo.
 * @dev Permite registrar activos con seguimiento de propietarios y modificaciones.
 */
contract FractalLandRegistry is AccessControlLand, ILandAuditable {
    using AssetStructs for AssetStructs.Asset;
    using AssetStructs for AssetStructs.Modification;

    // Almacén principal de activos por ID
    mapping(uint256 => AssetStructs.Asset) private assets;
    // Historial de propietarios por ID de activo
    mapping(uint256 => address[]) private ownerHistory;
    // Línea de tiempo de modificaciones por ID de activo
    mapping(uint256 => AssetStructs.Modification[]) private timelines;

    /**
     * @dev Se emite cuando se registra un nuevo activo. Los metadatos se envían
     *      en texto libre y quedan almacenados en el log de eventos.
     */
    event AssetRegistered(
        uint256 indexed assetId,
        bytes32 certificateHash,
        address indexed owner,
        string metadata
    );

    /**
     * @notice Inicializa el contrato configurando el administrador inicial.
     */
    constructor(address admin) AccessControlLand(admin) {}

    /**
     * @notice Registra un nuevo activo. Solo validadores pueden llamar.
     * @param assetId ID único del activo.
     * @param certHash Hash del certificado generado off-chain.
     * @param owner Dirección del propietario inicial.
     * @param metadata Datos descriptivos (ubicación, tipo, coordenadas, etc.).
     */
    function registerAsset(
        uint256 assetId,
        bytes32 certHash,
        address owner,
        string calldata metadata
    ) external onlyRole(VALIDATOR_ROLE) {
        require(assets[assetId].id == 0, "asset exists");
        AssetStructs.Asset memory asset = AssetStructs.Asset({
            id: assetId,
            certificateHash: certHash,
            currentOwner: owner,
            status: AssetStructs.AssetStatus.PENDIENTE
        });
        assets[assetId] = asset;
        ownerHistory[assetId].push(owner);
        timelines[assetId].push(
            AssetStructs.Modification({
                status: AssetStructs.AssetStatus.PENDIENTE,
                timestamp: block.timestamp,
                updatedBy: msg.sender
            })
        );
        emit AssetRegistered(assetId, certHash, owner, metadata);
    }

    /**
     * @notice Actualiza el estado de un activo registrado.
     * @param assetId ID del activo.
     * @param newStatus Nuevo estado del activo.
     */
    function updateAssetStatus(uint256 assetId, AssetStructs.AssetStatus newStatus)
        external
        onlyRole(VALIDATOR_ROLE)
    {
        AssetStructs.Asset storage asset = assets[assetId];
        require(asset.id != 0, "not found");
        asset.status = newStatus;
        timelines[assetId].push(
            AssetStructs.Modification({
                status: newStatus,
                timestamp: block.timestamp,
                updatedBy: msg.sender
            })
        );
    }

    /**
     * @notice Transfiere la propiedad de un activo a otra dirección.
     * @param assetId ID del activo a transferir.
     * @param newOwner Nueva dirección propietaria.
     */
    function transferAssetOwnership(uint256 assetId, address newOwner)
        external
        onlyRole(VALIDATOR_ROLE)
    {
        AssetStructs.Asset storage asset = assets[assetId];
        require(asset.id != 0, "not found");
        asset.currentOwner = newOwner;
        asset.status = AssetStructs.AssetStatus.TRANSFERIDO;
        ownerHistory[assetId].push(newOwner);
        timelines[assetId].push(
            AssetStructs.Modification({
                status: AssetStructs.AssetStatus.TRANSFERIDO,
                timestamp: block.timestamp,
                updatedBy: msg.sender
            })
        );
    }

    // --- Funciones de consulta para auditores y comunidad ---

    function getAsset(uint256 assetId)
        external
        view
        override
        returns (AssetStructs.Asset memory)
    {
        return assets[assetId];
    }

    function getOwnerHistory(uint256 assetId)
        external
        view
        override
        returns (address[] memory)
    {
        return ownerHistory[assetId];
    }

    function getTimeline(uint256 assetId)
        external
        view
        override
        returns (AssetStructs.Modification[] memory)
    {
        return timelines[assetId];
    }
}
