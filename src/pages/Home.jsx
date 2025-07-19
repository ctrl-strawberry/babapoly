import React, { useState, useEffect } from 'react';
import PlayerCard from '../components/PlayerCard';
import TransferForm from '../components/TransferForm';
import Modal from '../components/Modal';
import '../styles/Home.css';

function Home({ players, setPlayers, potMoney, setPotMoney }) {
  const bank = { id: 'bank', name: 'Banco', money: 'Infinito', color: '#E0E0E0' };
  const pot = { id: 'pot', name: 'Bote', money: potMoney, color: '#FFECB3' };

  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferFrom, setTransferFrom] = useState(null);
  const [transferTo, setTransferTo] = useState(null);
  const [animationData, setAnimationData] = useState({});

  const handlePlayerClick = (player) => {
    if (selectedPlayers.length === 0) {
      setSelectedPlayers([player]);
    } else if (selectedPlayers.length === 1) {
      setSelectedPlayers(prev => [...prev, player]);
      setTransferFrom(selectedPlayers[0]);
      setTransferTo(player);
      setShowTransferForm(true);
    } else {
      setSelectedPlayers([player]);
      setShowTransferForm(false);
      setTransferFrom(null);
      setTransferTo(null);
    }
  };

  const handleTransfer = (fromId, toId, amount) => {
    setPlayers(prevPlayers => {
      const newPlayers = prevPlayers.map(player => {
        if (player.id === fromId) {
          return { ...player, money: player.money - amount };
        } else if (player.id === toId) {
          return { ...player, money: player.money + amount };
        }
        return player;
      });

      if (fromId === 'bank') {
        // No se resta dinero del banco
      } else if (fromId === 'pot') {
        setPotMoney(prev => prev - amount);
      }

      if (toId === 'bank') {
        // No se añade dinero al banco
      } else if (toId === 'pot') {
        setPotMoney(prev => prev + amount);
      }

      const updatedPlayers = newPlayers.map(player => {
        let change = 0;
        if (player.id === fromId) {
          change = -amount;
        } else if (player.id === toId) {
          change = amount;
        }
        if (change !== 0) {
          setAnimationData(prev => ({ ...prev, [player.id]: change }));
          setTimeout(() => {
            setAnimationData(prev => {
              const newAnim = { ...prev };
              delete newAnim[player.id];
              return newAnim;
            });
          }, 5000); // La animación dura 5 segundos
        }
        return player;
      });

      return updatedPlayers;
    });
  };

  return (
    <div className="home-page">
      <h2>Página de Inicio</h2>
      <div className="players-grid">
        {players.map(player => (
          <PlayerCard
            key={player.id}
            name={player.name}
            money={player.money}
            color={player.color}
            onClick={() => handlePlayerClick(player)}
            isSelected={selectedPlayers.some(p => p.id === player.id)}
            animationChange={animationData[player.id]}
          />
        ))}
        <PlayerCard
            key={bank.id}
            name={bank.name}
            money={bank.money}
            color={bank.color}
            onClick={() => handlePlayerClick(bank)}
            isSelected={selectedPlayers.some(p => p.id === bank.id)}
            animationChange={animationData[bank.id]}
          />
        <PlayerCard
            key={pot.id}
            name={pot.name}
            money={pot.money}
            color={pot.color}
            onClick={() => handlePlayerClick(pot)}
            isSelected={selectedPlayers.some(p => p.id === pot.id)}
            animationChange={animationData[pot.id]}
          />
      </div>

      {showTransferForm && transferFrom && transferTo && (
        <Modal onClose={() => {
          setShowTransferForm(false);
          setSelectedPlayers([]);
          setTransferFrom(null);
          setTransferTo(null);
        }}>
          <TransferForm
            players={players}
            bank={bank}
            pot={pot}
            onTransfer={handleTransfer}
            potMoney={potMoney}
            setPotMoney={setPotMoney}
            initialFrom={transferFrom}
            initialTo={transferTo}
            onClose={() => {
              setShowTransferForm(false);
              setSelectedPlayers([]);
              setTransferFrom(null);
              setTransferTo(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export default Home;