import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Votes() {
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    axios.get('/votes').then(res => setVotes(res.data));
  }, []);

  return (
    <section>
      <h2>Votos</h2>
      <ul>
        {votes.map(v => (
          <li key={v.tx}>{v.voter} -> {v.proposal_id} ({v.support})</li>
        ))}
      </ul>
    </section>
  );
}
