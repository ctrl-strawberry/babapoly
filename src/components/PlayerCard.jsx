import React from 'react';
import '../styles/PlayerCard.css';

function PlayerCard({ name, money, color, onClick, isSelected, animationChange }) {
  return (
    <button className={`player-card ${isSelected ? 'selected' : ''}`} style={{ backgroundColor: color }} onClick={onClick}>
      <span className="player-name">{name}</span>
      <span className="player-money">${money}</span>
      {animationChange && (
        <span className={`money-animation ${animationChange > 0 ? 'gain' : 'loss'}`}>
          {animationChange > 0 ? '+' : ''}${animationChange}
        </span>
      )}
    </button>
  );
}

export default PlayerCard;