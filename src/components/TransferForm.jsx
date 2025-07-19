import React, { useState, useEffect } from 'react';
import '../styles/TransferForm.css';

function TransferForm({ players, bank, pot, onTransfer, potMoney, setPotMoney, initialFrom, initialTo, onClose }) {
  const [from, setFrom] = useState(initialFrom ? initialFrom.id : '');
  const [to, setTo] = useState(initialTo ? initialTo.id : '');

  useEffect(() => {
    if (initialFrom) {
      setFrom(initialFrom.id);
    }
    if (initialTo) {
      setTo(initialTo.id);
    }
  }, [initialFrom, initialTo]);
  const [amount, setAmount] = useState('');

  const allEntities = [bank, pot, ...players];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (from && to && amount > 0) {
      onTransfer(from, to, parseInt(amount));
      setAmount('');
      onClose(); // Cerrar el formulario después de la transferencia
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transfer-form">
      <h3>Realizar Transferencia</h3>
      <select value={from} onChange={(e) => setFrom(e.target.value)}>
        <option value="">Origen</option>
        {allEntities.map(entity => (
          <option key={entity.id} value={entity.id}>{entity.name}</option>
        ))}
      </select>
      <select value={to} onChange={(e) => setTo(e.target.value)}>
        <option value="">Destino</option>
        {allEntities.map(entity => (
          <option key={entity.id} value={entity.id}>{entity.name}</option>
        ))}
      </select>
      <input
        type="number"
        placeholder="Cantidad"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button type="submit">Transferir</button>
      <button type="button" onClick={onClose}>Cerrar</button>
    </form>
  );
}

export default TransferForm;