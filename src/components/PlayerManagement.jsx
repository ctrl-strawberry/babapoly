import { useState } from 'react';
import Modal from './Modal';
import AddPlayerModal from './AddPlayerModal';
import PlayerCard from './PlayerCard'; // Import PlayerCard
import '../styles/PlayerManagement.css';

function PlayerManagement({ players, setPlayers, setPotMoney }) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerMoney, setNewPlayerMoney] = useState(1500);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [initialMoney, setInitialMoney] = useState(1500);
  const [showResetGameModal, setShowResetGameModal] = useState(false);
  const [showInitialMoneyModal, setShowInitialMoneyModal] = useState(false);

  const handleAddPlayer = (player) => {
    setPlayers(prevPlayers => [...prevPlayers, player]);
  };

  const confirmDeletePlayer = (id) => {
    setPlayerToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeletePlayer = () => {
    setPlayers(prevPlayers => prevPlayers.filter(player => player.id !== playerToDelete));
    setShowDeleteModal(false);
    setPlayerToDelete(null);
  };

  const handleResetPlayers = () => {
    setPlayers([]);
  };

  const confirmResetGame = () => {
    setShowResetGameModal(true);
  };

  const handleResetGame = () => {
    setPlayers([]);
    setPotMoney(0);
    setShowResetGameModal(false);
  };

  const handleSetInitialMoney = () => {
    setShowInitialMoneyModal(true);
  };

  const handleConfirmInitialMoney = () => {
    // Logic to apply initialMoney to new players or existing ones if needed
    // For now, it just closes the modal
    setShowInitialMoneyModal(false);
  };

  return (
    <div className="player-management-container">
      <h3>Gestión de Jugadores</h3>
      <div className="add-player-section">
        <button onClick={() => setShowAddPlayerModal(true)}>Añadir Usuario</button>
      </div>

      <div className="player-list-section">
        <h4>Jugadores Actuales</h4>
        <ul className="player-list">
          {players.map(player => (
            <PlayerCard key={player.id} player={player} onDelete={confirmDeletePlayer} />
          ))}
        </ul>
      </div>

      <div className="settings-actions">
        <button onClick={handleSetInitialMoney}>Cantidad Inicial</button>
        <button onClick={confirmResetGame}>Resetear Juego</button>
      </div>

      {showDeleteModal && (
        <Modal
          title="Confirmar Eliminación"
          message="¿Estás seguro de que quieres eliminar a este jugador?"
          onConfirm={handleDeletePlayer}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {showResetGameModal && (
        <Modal
          title="Confirmar Reseteo de Juego"
          message="¿Estás seguro de que quieres resetear la partida actual? Esto eliminará a todos los jugadores y el dinero del bote."
          onConfirm={handleResetGame}
          onCancel={() => setShowResetGameModal(false)}
        />
      )}

      {showAddPlayerModal && (
        <AddPlayerModal
          onClose={() => setShowAddPlayerModal(false)}
          onAddPlayer={handleAddPlayer}
          players={players}
        />
      )}

      {showInitialMoneyModal && (
        <Modal
          title="Establecer Cantidad Inicial"
          onCancel={() => setShowInitialMoneyModal(false)}
        >
          <div className="initial-money-form">
            <label>
              Cantidad Inicial:
              <input
                type="number"
                value={initialMoney}
                onChange={(e) => setInitialMoney(parseInt(e.target.value))}
              />
            </label>
            <button onClick={handleConfirmInitialMoney}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default PlayerManagement;