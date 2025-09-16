// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./utils/ReputationMath.sol";
import "./DelegationRegistry.sol";
import "./interfaces/IReputationAware.sol";

/**
 * @title ReputationGovernance
 * @notice Manages dynamic reputation and vote delegation for FractalDAO members.
 * The reputation score is derived from longevity, voting participation,
 * accuracy compared to the majority and economic activity in the DAO token.
 */
contract ReputationGovernance is IReputationAware {
    using ReputationMath for uint256;

    IERC20 public immutable frtToken;
    DelegationRegistry public immutable registry;
    uint256 public economicThreshold;

    struct RepData {
        uint256 blockJoined;
        uint256 votesCast;
        uint256 votesReceived;
        uint256 votesWithMajority;
        uint256 economicActivity;
        bool exists;
    }

    mapping(address => RepData) private reps;
    mapping(address => address) public delegates;
    mapping(address => uint256) private delegatedVotes;
    mapping(address => address[]) private delegators;

    event Delegated(address indexed from, address indexed to);
    event Undelegated(address indexed delegator);
    event ReputationUpdated(address indexed user, uint256 newScore);

    constructor(IERC20 token, uint256 activityThreshold, DelegationRegistry reg) {
        frtToken = token;
        economicThreshold = activityThreshold;
        registry = reg;
    }

    modifier ensureProfile(address user) {
        RepData storage r = reps[user];
        if (!r.exists) {
            r.blockJoined = block.number;
            r.exists = true;
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                                Delegation
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IReputationAware
    function getDelegatedVotes(address account) public view override returns (uint256) {
        return delegatedVotes[account];
    }

    /// @inheritdoc IReputationAware
    function getDelegators(address account) public view override returns (address[] memory) {
        return delegators[account];
    }

    /// @notice Delegate voting power to another address.
    function delegate(address to) external ensureProfile(msg.sender) {
        require(delegates[msg.sender] == address(0), "already delegated");
        delegates[msg.sender] = to;
        if (to != address(0)) {
            delegatedVotes[to] += frtToken.balanceOf(msg.sender);
            delegators[to].push(msg.sender);
            registry.recordDelegation(msg.sender, to);
        }
        emit Delegated(msg.sender, to);
    }

    /// @notice Revoke an active delegation.
    function undelegate() external {
        address current = delegates[msg.sender];
        require(current != address(0), "no delegate");
        delegates[msg.sender] = address(0);
        delegatedVotes[current] -= frtToken.balanceOf(msg.sender);
        _removeDelegator(current, msg.sender);
        registry.recordDelegation(msg.sender, address(0));
        emit Undelegated(msg.sender);
    }

    function _removeDelegator(address delegatee, address delegator) internal {
        address[] storage list = delegators[delegatee];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == delegator) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                                Reputation Logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IReputationAware
    function getReputationScore(address user) public view override returns (uint256) {
        RepData storage r = reps[user];
        if (!r.exists) return 0;
        uint256 age = block.number - r.blockJoined;
        uint256 participation = r.votesCast + r.votesReceived;
        return ReputationMath.computeScore(age, participation, r.votesWithMajority, r.economicActivity);
    }

    /// @notice Record that a user voted. Optionally specify if they sided with the majority.
    function recordVote(address voter, bool withMajority) external ensureProfile(voter) {
        RepData storage r = reps[voter];
        r.votesCast += 1;
        if (withMajority) {
            r.votesWithMajority += 1;
        }
        emit ReputationUpdated(voter, getReputationScore(voter));
    }

    /// @notice Record that a user received a vote.
    function recordReceivedVote(address user) external ensureProfile(user) {
        reps[user].votesReceived += 1;
        emit ReputationUpdated(user, getReputationScore(user));
    }

    /// @notice Record economic activity over a threshold in FRT tokens.
    function recordEconomicActivity(address user, uint256 amount) external ensureProfile(user) {
        if (amount >= economicThreshold) {
            reps[user].economicActivity += amount;
            emit ReputationUpdated(user, getReputationScore(user));
        }
    }

    /// @notice Convert a reputation score into additional voting weight.
    function weightFromReputation(uint256 score) public pure returns (uint256) {
        return score;
    }
}
