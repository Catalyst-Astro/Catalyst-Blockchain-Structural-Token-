import React, { useEffect, useState } from 'react';

export default function GlifoRenderer({ hash }) {
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    async function fetchSvg() {
      try {
        const res = await fetch(`https://ipfs.io/ipfs/${hash}`);
        const text = await res.text();
        setSvg(text);
      } catch (err) {
        console.error('Failed to load glifo', err);
      }
    }
    if (hash) fetchSvg();
  }, [hash]);

  if (!svg) return null;
  return <div dangerouslySetInnerHTML={{ __html: svg }} />;
}
