import { useEffect, useState } from 'react';

function App() {
  const [serveurMessage, setServeurMessage] = useState('Connexion au serveur en cours...');

  // Si une adresse en ligne existe, on l'utilise. Sinon, on utilise localhost:5000
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // On va chercher les données sur le backend
    fetch(`${API_URL}/api/message`)
      .then((response) => response.json())
      .then((data) => setServeurMessage(data.text))
      .catch((error) => setServeurMessage('Impossible de joindre le serveur ❌'));
  }, [API_URL]);

  return (
    <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'Arial' }}>
      <h1>Mon Application Full-Stack 🚀</h1>
      <p style={{ fontSize: '20px', color: '#4A5568' }}>
        Statut du serveur : <strong>{serveurMessage}</strong>
      </p>
    </div>
  );
}

export default App;
