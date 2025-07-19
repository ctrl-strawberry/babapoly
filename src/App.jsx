import React, { useState } from 'react';
import AppRouter from './components/AppRouter';

function App() {
  const [players, setPlayers] = useState([
    { id: 'player1', name: 'Jugador 1', money: 1500, color: '#FFDDC1' },
    { id: 'player2', name: 'Jugador 2', money: 1500, color: '#DCF8C6' },
    { id: 'player3', name: 'Jugador 3', money: 1500, color: '#C1DFF0' },
  ]);
  const [potMoney, setPotMoney] = useState(0);

  return (
    <div className="App">
      <AppRouter players={players} setPlayers={setPlayers} potMoney={potMoney} setPotMoney={setPotMoney} />
    </div>
  );
}

export default App;