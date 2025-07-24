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
      <div className="terminal-header">
        <span className="terminal-title">Transferencia de dinero</span>
      </div>
      <div className="transfer-display">
        <span>{initialFrom ? initialFrom.name : 'Origen'}</span>
        <span className="arrow"> &gt; </span>
        <span>{initialTo ? initialTo.name : 'Destino'}</span>
      </div>
      <input
        type="number"
        placeholder="Cantidad"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        autoFocus
      />
      <button type="submit">(t) Transferir</button>
    </form>
  );
}

export default TransferForm;