import React from 'react';
import PlayerManagement from '../components/PlayerManagement';
import '../styles/Settings.css';

function Settings({ players, setPlayers, setPotMoney }) {
  return (
    <div className="settings-page">
      <h2>Página de Ajustes</h2>
      <PlayerManagement players={players} setPlayers={setPlayers} setPotMoney={setPotMoney} />
    </div>
  );
}

export default Settings;