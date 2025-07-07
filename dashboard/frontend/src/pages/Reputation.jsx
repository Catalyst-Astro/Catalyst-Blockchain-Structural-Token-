import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Reputation() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    axios.get('/scores').then(res => setScores(res.data));
  }, []);

  return (
    <section>
      <h2>Ranking Reputacional</h2>
      <ol>
        {scores.map(s => (
          <li key={s.user}>{s.user} - {s.score}</li>
        ))}
      </ol>
    </section>
  );
}
