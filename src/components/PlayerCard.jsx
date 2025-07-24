import React from 'react';
import '../styles/PlayerCard.css';

function PlayerCard({ player, onClick, isSelected, animationChange }) {
  return (
    <button className={`player-card ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <img src={player.image || '/babapoly/images/jugador.png'} alt={player.name} className="player-image" />
      <div className="player-info">
        <span className="player-name">{player.name}</span>
        <span className="player-money">${player.money}</span>
      </div>
      {animationChange && (
        <div className={`money-animation ${animationChange > 0 ? 'gain' : 'loss'}`}>
          {animationChange > 0 ? '+' : ''}{animationChange}
        </div>
      )}
    </button>
  );
}

export default PlayerCard;