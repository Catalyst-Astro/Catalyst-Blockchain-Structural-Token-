import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Proposals() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    axios.get('/proposals').then(res => setItems(res.data));
  }, []);

  return (
    <section>
      <h2>Propuestas</h2>
      <ul>
        {items.map(p => (
          <li key={p.id}>{p.description} - {p.proposer}</li>
        ))}
      </ul>
    </section>
  );
}
