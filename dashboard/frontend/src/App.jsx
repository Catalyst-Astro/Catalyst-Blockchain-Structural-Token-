import React from 'react';
import Proposals from './pages/Proposals.jsx';
import Votes from './pages/Votes.jsx';
import Reputation from './pages/Reputation.jsx';
import Interventions from './pages/Interventions.jsx';
import FilterBar from './components/FilterBar.jsx';
import ExportButtons from './components/ExportButtons.jsx';
import PublicWidget from './components/PublicWidget.jsx';

export default function App() {
  return (
    <div className="container">
      <h1>FractalDAO Governance Dashboard</h1>
      <FilterBar />
      <Proposals />
      <Votes />
      <Reputation />
      <Interventions />
      <ExportButtons />
      <PublicWidget />
    </div>
  );
}
