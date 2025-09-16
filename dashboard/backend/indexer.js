import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { query } from './db/index.js';

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL);

const fractalDaoAddress = process.env.FRACTAL_DAO_ADDRESS;
const reputationAddress = process.env.REPUTATION_ADDRESS;
const guardianAddress = process.env.GUARDIAN_ADDRESS;

const fractalDaoAbi = [
  'event ProposalCreated(uint256 indexed id,address proposer,string description)',
  'event VoteCast(address indexed voter,uint256 indexed proposalId,uint8 support)',
  'event ProposalExecuted(uint256 indexed id)'
];

const reputationAbi = [
  'event Delegated(address indexed from,address indexed to)',
  'event ScoreUpdated(address indexed user,uint256 newScore)'
];

const guardianAbi = [
  'event Intervention(address indexed council,string details)'
];

const fractalDao = new ethers.Contract(fractalDaoAddress, fractalDaoAbi, provider);
const reputation = new ethers.Contract(reputationAddress, reputationAbi, provider);
const guardian = new ethers.Contract(guardianAddress, guardianAbi, provider);

async function saveEvent(table, data) {
  const columns = Object.keys(data).join(',');
  const placeholders = Object.keys(data).map((_, i) => `$${i + 1}`).join(',');
  const values = Object.values(data);
  await query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
}

export function startIndexing() {
  fractalDao.on('ProposalCreated', async (id, proposer, description, event) => {
    await saveEvent('proposals', {
      id: id.toString(),
      proposer,
      description,
      tx: event.transactionHash
    });
  });

  fractalDao.on('VoteCast', async (voter, proposalId, support, event) => {
    await saveEvent('votes', {
      proposal_id: proposalId.toString(),
      voter,
      support,
      tx: event.transactionHash
    });
  });

  fractalDao.on('ProposalExecuted', async (id, event) => {
    await saveEvent('executions', {
      id: id.toString(),
      tx: event.transactionHash
    });
  });

  reputation.on('Delegated', async (from, to, event) => {
    await saveEvent('delegations', { delegator: from, delegatee: to, tx: event.transactionHash });
  });

  reputation.on('ScoreUpdated', async (user, newScore, event) => {
    await saveEvent('scores', { user, score: newScore.toString(), tx: event.transactionHash });
  });

  guardian.on('Intervention', async (council, details, event) => {
    await saveEvent('interventions', { council, details, tx: event.transactionHash });
  });

  console.log('Indexing started...');
}

if (process.argv[1].includes('indexer.js')) {
  startIndexing();
}
