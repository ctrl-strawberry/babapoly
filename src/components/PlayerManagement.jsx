import React, { useState } from 'react'; // Ensure useState is imported
import '../styles/PlayerManagement.css';

function PlayerManagement({ players, setPlayers, setPotMoney }) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerMoney, setNewPlayerMoney] = useState(1500);

  const handleAddPlayer = () => {
    if (newPlayerName.trim() === '') return;
    const newPlayer = {
      id: `player${players.length + 1}`,
      name: newPlayerName,
      money: newPlayerMoney,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}` // Color aleatorio
    };
    setPlayers(prevPlayers => [...prevPlayers, newPlayer]);
    setNewPlayerName('');
    setNewPlayerMoney(1500);
  };

  const handleDeletePlayer = (id) => {
    setPlayers(prevPlayers => prevPlayers.filter(player => player.id !== id));
  };

  const handleResetPlayers = () => {
    setPlayers([
      { id: 'player1', name: 'Jugador 1', money: 1500, color: '#FFDDC1' },
      { id: 'player2', name: 'Jugador 2', money: 1500, color: '#DCF8C6' },
      { id: 'player3', name: 'Jugador 3', money: 1500, color: '#C1DFF0' },
    ]);
  };

  const handleResetGame = () => {
    setPlayers([
      { id: 'player1', name: 'Jugador 1', money: 1500, color: '#FFDDC1' },
      { id: 'player2', name: 'Jugador 2', money: 1500, color: '#DCF8C6' },
      { id: 'player3', name: 'Jugador 3', money: 1500, color: '#C1DFF0' },
    ]);
    setPotMoney(0);
  };

  return (
    <div className="player-management-container">
      <h3>Gestión de Jugadores</h3>
      <div className="add-player-section">
        <input
          type="text"
          placeholder="Nombre del nuevo jugador"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Dinero inicial"
          value={newPlayerMoney}
          onChange={(e) => setNewPlayerMoney(parseInt(e.target.value))}
        />
        <button onClick={handleAddPlayer}>Añadir Jugador</button>
      </div>

      <div className="player-list-section">
        <h4>Jugadores Actuales</h4>
        <ul>
          {players.map(player => (
            <li key={player.id}>
              {player.name} (${player.money})
              <button onClick={() => handleDeletePlayer(player.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="reset-section">
        <button onClick={handleResetPlayers}>Resetear Jugadores</button>
        <button onClick={handleResetGame}>Resetear Juego</button>
      </div>
    </div>
  );
}

export default PlayerManagement;