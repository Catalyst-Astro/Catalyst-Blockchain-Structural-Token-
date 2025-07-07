<<< o80i92-codex/crear-módulo-emisión-de-token-erc-20/721/1155
require("@nomiclabs/hardhat-ethers");
module.exports = {
  solidity: "0.8.20",
=======
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  paths: {
    sources: "contracts",
    artifacts: "artifacts"
  }
>>>n
};
