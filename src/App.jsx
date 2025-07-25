import { useState } from 'react';
import AppRouter from './components/AppRouter';

function App() {
  const [players, setPlayers] = useState([
    { id: 'player1', name: 'Jugador 1', money: 1500, color: '#FFDDC1', image: '/images/jugador.png' },
    { id: 'player2', name: 'Jugador 2', money: 1500, color: '#DCF8C6', image: '/images/jugador.png' },
    { id: 'player3', name: 'Jugador 3', money: 1500, color: '#C1DFF0', image: '/images/jugador.png' },
  ]);
  const [potMoney, setPotMoney] = useState(0);

  return (
    <div className="App">
      <AppRouter players={players} setPlayers={setPlayers} potMoney={potMoney} setPotMoney={setPotMoney} />
      <video autoPlay loop muted className="background-video">
        <source src="/public/images/videoplayback.mp4" type="video/mp4" />
        Tu navegador no soporta la etiqueta de video.
      </video>
    </div>
  );
}

export default App;