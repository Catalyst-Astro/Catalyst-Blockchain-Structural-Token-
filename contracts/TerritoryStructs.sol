// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

library TerritoryStructs {
    enum NucleusType { RURAL, URBANO, MIXTO }

    struct Metadata {
        uint256 id;
        string name;
        string coordinates;
        string politicalEntity;
        NucleusType nucleusType;
        address parentDAO;
        address localGovernment;
    }

    struct ValidationDocs {
        bool daoValidator;
        bool actaFundacional;
        bool technicalCommittee;
    }
}

