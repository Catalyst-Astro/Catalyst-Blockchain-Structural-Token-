// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GasRelayer — Paga gas en ETH, cobra en CAT
/// @notice Permite a usuarios sin ETH ejecutar transacciones pagando solo CAT.
///         El protocolo adelanta el gas y recibe CAT como rembolso al rate del oracle.
/// @dev Catalyst Blockchain Labs S.A. de C.V.
contract GasRelayer {
    /// CAT token used for gas payment
    IERC20 public immutable catToken;

    /// Price oracle for CAT/MXN/ETH rates
    IMXNPriceOracle public oracle;

    /// ETH pool available for sponsoring gas
    uint256 public ethPool;

    /// CAT accumulated from gas reimbursements
    uint256 public catCollected;

    /// Whether address is an authorized relayer
    mapping(address => bool) public isRelayer;

    /// Prevent replay: nonce per user
    mapping(address => uint256) public nonces;

    /// Gas markup: 1 CAT = MXN_CAT_RATE * GAS_MARKUP_BPS / 10000 gas value
    uint256 public gasMarkupBps = 10500; // 5% markup over oracle rate

    // ===== Events =====
    event Relayed(address indexed user, address indexed target, uint256 gasPaidETH, uint256 catCharged);
    event Funded(address indexed funder, uint256 ethAmount);
    event Withdrawn(address indexed to, uint256 ethAmount, uint256 catAmount);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    constructor(address catToken_, address oracle_, address initialRelayer_) {
        require(catToken_ != address(0), "CAT required");
        catToken = IERC20(catToken_);
        oracle = IMXNPriceOracle(oracle_);
        isRelayer[initialRelayer_] = true;
    }

    // ===== Relayer Management =====
    modifier onlyRelayer() { require(isRelayer[msg.sender], "not relayer"); _; }

    function setRelayer(address relayer, bool enabled) external {
        require(msg.sender == address(this) || isRelayer[msg.sender], "unauthorized");
        isRelayer[relayer] = enabled;
    }

    function setOracle(address newOracle) external onlyRelayer {
        emit OracleUpdated(address(oracle), newOracle);
        oracle = IMXNPriceOracle(newOracle);
    }

    function setGasMarkup(uint256 bps) external onlyRelayer {
        gasMarkupBps = bps;
    }

    // ===== Funding =====
    /// Anyone can fund the ETH pool
    function fund() external payable {
        ethPool += msg.value;
        emit Funded(msg.sender, msg.value);
    }

    /// Protocol can withdraw excess ETH or accumulated CAT
    function withdraw(address to, uint256 ethAmount, uint256 catAmount) external onlyRelayer {
        if (ethAmount > 0 && ethAmount <= ethPool) {
            ethPool -= ethAmount;
            (bool ok,) = to.call{value: ethAmount}("");
            require(ok, "ETH transfer failed");
        }
        if (catAmount > 0) {
            catToken.transfer(to, catAmount);
            if (catAmount <= catCollected) catCollected -= catAmount;
        }
        emit Withdrawn(to, ethAmount, catAmount);
    }

    // ===== Meta-Transaction Execution =====
    /// Execute a meta-transaction signed by the user.
    /// The user signs: keccak256(abi.encode(target, value, data, nonce, maxCatToPay, deadline))
    /// The relayer submits it, pays gas in ETH, and CAT is deducted from user.
    function relay(
        address user,
        address target,
        uint256 value,
        bytes calldata data,
        uint256 maxCatToPay,
        uint256 deadline,
        bytes calldata signature
    ) external onlyRelayer returns (bytes memory) {
        require(block.timestamp <= deadline, "expired");
        require(ethPool > 0, "eth pool empty");

        // Verify signature
        bytes32 hash = keccak256(
            abi.encode(target, value, data, nonces[user], maxCatToPay, deadline, block.chainid, address(this))
        );
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        address recovered = _recoverSigner(ethSignedHash, signature);
        require(recovered == user, "invalid signature");

        nonces[user]++;

        // Calculate CAT cost
        uint256 catCost = _calculateGasCost(value);
        require(catCost <= maxCatToPay, "gas cost exceeds max");
        require(catToken.balanceOf(user) >= catCost, "insufficient CAT");
        require(catToken.allowance(user, address(this)) >= catCost, "approve CAT first");

        // Record gas before execution
        uint256 gasBefore = gasleft();

        // Transfer CAT from user to this contract
        catToken.transferFrom(user, address(this), catCost);
        catCollected += catCost;

        // Execute the user's transaction
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, string(abi.encodePacked("tx failed: ", result)));

        // Calculate actual gas used
        uint256 gasUsed = gasBefore - gasleft() + 21000; // base tx cost
        uint256 ethSpent = gasUsed * tx.gasprice;
        if (ethSpent <= ethPool) {
            ethPool -= ethSpent;
        } else {
            ethPool = 0; // drain remaining
        }

        emit Relayed(user, target, ethSpent, catCost);
        return result;
    }

    /// Calculate CAT cost for a transaction based on oracle rates
    function _calculateGasCost(uint256 /* callValue */) internal view returns (uint256) {
        // Get CAT/MXN rate from oracle (scaled 1e18)
        uint256 catMxnRate = oracle.getCatMxnRate(); // 1 CAT = X MXN (e.g., 2e18 = $2 MXN)

        // Estimate gas: ~200k for a typical meta-tx
        uint256 estimatedGas = 200_000;

        // ETH gas price (in wei)
        uint256 gasPrice = tx.gasprice;

        // ETH cost in wei
        uint256 ethCost = estimatedGas * gasPrice;

        // Convert ETH cost to MXN using oracle
        uint256 usdMxnRate = oracle.getUsdMxnRate(); // 1 USD = X MXN (e.g., 20e18 = $20 MXN)
        uint256 catUsdRate = oracle.getCatUsdRate();  // 1 CAT = X USD (e.g., 0.1e18 = $0.10)

        // ETH/USD rate: approximately $2000 USD per ETH (hardcoded as fallback)
        uint256 ethUsdRate = 2000e18;

        // ethCost in MXN: ethCost * ethUsdRate * usdMxnRate / 1e18
        // But this gets complex with decimals. Simplified:
        // CAT per tx = gasMarkup * CAT_USD / ETH_USD * (estimatedGas * gasPrice / 1e18)
        uint256 baseCatCost = (ethCost * ethUsdRate * gasMarkupBps) / (catUsdRate * 10000 * 1e18);

        // Minimum 1 CAT (1e18 wei of CAT)
        if (baseCatCost < 1e18) baseCatCost = 1e18;

        return baseCatCost;
    }

    function _recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "invalid sig length");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        if (v < 27) v += 27;
        return ecrecover(hash, v, r, s);
    }

    /// Estimate CAT cost for a transaction (off-chain query)
    function estimateGasCost() external view returns (uint256 catCost, uint256 estimatedGas, uint256 gasPrice) {
        estimatedGas = 200_000;
        gasPrice = tx.gasprice;
        catCost = _calculateGasCost(0);
        return (catCost, estimatedGas, gasPrice);
    }

    receive() external payable {
        ethPool += msg.value;
        emit Funded(msg.sender, msg.value);
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IMXNPriceOracle {
    function getCatMxnRate() external view returns (uint256);
    function getCatUsdRate() external view returns (uint256);
    function getUsdMxnRate() external view returns (uint256);
}
