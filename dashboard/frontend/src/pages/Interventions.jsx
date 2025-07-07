import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Interventions() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    axios.get('/interventions').then(res => setItems(res.data));
  }, []);

  return (
    <section>
      <h2>Intervenciones</h2>
      <ul>
        {items.map(i => (
          <li key={i.tx}>{i.council}: {i.details}</li>
        ))}
      </ul>
    </section>
  );
}
