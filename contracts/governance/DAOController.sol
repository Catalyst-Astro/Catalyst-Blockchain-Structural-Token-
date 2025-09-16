pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DAOController
 * @notice Simple controller that handles proposals and subsidies
 * using Fractal Token as governance weight.
 */
contract DAOController is Ownable {
    IERC20 public immutable governanceToken;

    struct Proposal {
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    event ProposalCreated(uint256 indexed id, string description);
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id);
    event SubsidyGranted(address indexed to, uint256 amount);

    constructor(IERC20 token) Ownable(msg.sender) {
        governanceToken = token;
    }

    /// @notice Create a new proposal for DAO members to vote on.
    function createProposal(string memory description) external returns (uint256) {
        uint256 id = proposalCount++;
        proposals[id].description = description;
        emit ProposalCreated(id, description);
        return id;
    }

    /// @notice Vote on an existing proposal with weight equal to token balance.
    function vote(uint256 id, bool support) external {
        Proposal storage p = proposals[id];
        require(!p.executed, "executed");
        uint256 weight = governanceToken.balanceOf(msg.sender);
        require(weight > 0, "no weight");
        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }
        emit Voted(id, msg.sender, support, weight);
    }

    /// @notice Execute a passed proposal.
    function execute(uint256 id) external onlyOwner {
        Proposal storage p = proposals[id];
        require(!p.executed, "executed");
        require(p.votesFor > p.votesAgainst, "not approved");
        p.executed = true;
        emit ProposalExecuted(id);
    }

    /// @notice Grant subsidy tokens to an address.
    function grantSubsidy(address to, uint256 amount) external onlyOwner {
        require(governanceToken.transfer(to, amount), "transfer failed");
        emit SubsidyGranted(to, amount);
    }
}
