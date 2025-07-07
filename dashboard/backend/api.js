import express from 'express';
import dotenv from 'dotenv';
import { query } from './db/index.js';
import { startIndexing } from './indexer.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/proposals', async (_req, res) => {
  const { rows } = await query('SELECT * FROM proposals ORDER BY id DESC LIMIT 50');
  res.json(rows);
});

app.get('/votes', async (_req, res) => {
  const { rows } = await query('SELECT * FROM votes ORDER BY proposal_id DESC');
  res.json(rows);
});

app.get('/scores', async (_req, res) => {
  const { rows } = await query('SELECT * FROM scores ORDER BY score DESC');
  res.json(rows);
});

app.get('/delegations', async (_req, res) => {
  const { rows } = await query('SELECT * FROM delegations ORDER BY tx DESC');
  res.json(rows);
});

app.get('/interventions', async (_req, res) => {
  const { rows } = await query('SELECT * FROM interventions ORDER BY tx DESC');
  res.json(rows);
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
  if (process.env.START_INDEXER === 'true') {
    startIndexing();
  }
});
