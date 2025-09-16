// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";

contract DAOFactory {
    event DAOCloned(address indexed newDAO, address indexed template);

    function clone(address template, bytes calldata initData) external returns (address cloneAddress) {
        cloneAddress = Clones.clone(template);
        if (initData.length > 0) {
            (bool ok,) = cloneAddress.call(initData);
            require(ok, "init failed");
        }
        emit DAOCloned(cloneAddress, template);
    }
}

