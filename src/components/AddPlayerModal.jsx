import React, { useState } from 'react';
import Modal from './Modal';
import '../styles/AddPlayerModal.css';

function AddPlayerModal({ onClose, onAddPlayer, players }) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerMoney, setNewPlayerMoney] = useState(1500);
  const [newPlayerImage, setNewPlayerImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNewPlayerImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setNewPlayerImage(null);
      setImagePreview(null);
    }
  };

  const handleAddGenericPlayer = () => {
    const genericPlayer = {
      id: `player${players.length + 1}`,
      name: 'Jugador',
      money: 1500,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      image: '/images/jugador.png'
    };
    onAddPlayer(genericPlayer);
    onClose();
  };

  const handleAddCustomPlayer = () => {
    if (newPlayerName.trim() === '') return;

    const customPlayer = {
      id: `player${players.length + 1}`,
      name: newPlayerName,
      money: newPlayerMoney,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
      image: imagePreview || '/images/jugador.png' // Use uploaded image or generic
    };
    onAddPlayer(customPlayer);
    onClose();
  };

  return (
    <Modal title="Añadir Jugador" onCancel={onClose}>
      <div className="add-player-modal-content">
        <button onClick={handleAddGenericPlayer} className="add-generic-button">
          Añadir Jugador de Ejemplo (Jugador.png)
        </button>
        <hr />
        <h4>Añadir Jugador Personalizado</h4>
        <div className="custom-player-form">
          <label>
            Nombre:
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Introduce el nombre"
            />
          </label>
          <label>
            Dinero Inicial:
            <input
              type="number"
              value={newPlayerMoney}
              onChange={(e) => setNewPlayerMoney(parseInt(e.target.value))}
            />
          </label>
          <label>
            Foto:
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>
          {imagePreview && (
            <div className="image-preview-container">
              <img src={imagePreview} alt="Previsualización" className="image-preview" />
            </div>
          )}
          <button onClick={handleAddCustomPlayer} className="add-custom-button">Añadir Jugador</button>
        </div>
      </div>
    </Modal>
  );
}

export default AddPlayerModal;