const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000; // Utilise le port de Render en ligne, ou 5000 en local

// Autorise notre React (et d'autres sites) à interroger ce serveur
app.use(cors());
app.use(express.json());

// Notre première route API (lorsqu'on charge l'adresse du serveur)
app.get('/api/message', (req, res) => {
    res.json({ text: "Bravo ! Ce message vient du serveur Node.js 🔥" });
});

// Lance le serveur
app.listen(PORT, () => {
    console.log(`Le serveur tourne sur http://localhost:${PORT}`);
});
