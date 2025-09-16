import React from 'react';
import GlifoRenderer from './GlifoRenderer';

const principleColors = {
  agua: 'bg-blue-500',
  fuego: 'bg-red-500',
  tierra: 'bg-green-500',
  aire: 'bg-yellow-400'
};

const archetypeShapes = {
  solar: 'rounded-full',
  custodio: 'rounded-none',
  lunar: 'rounded-lg'
};

export default function BlockNode({ block, onClick }) {
  const color = principleColors[block.principio] || 'bg-gray-400';
  const shape = archetypeShapes[block.arquetipo] || 'rounded-md';
  const activeClass = block.activo ? 'animate-pulseSlow brightness-125' : '';

  return (
    <div
      className={`w-16 h-16 flex items-center justify-center cursor-pointer shadow-md ${color} ${shape} ${activeClass}`}
      onClick={() => onClick(block)}
    >
      {block.glifo_hash && <GlifoRenderer hash={block.glifo_hash} />}
    </div>
  );
}
