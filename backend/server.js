const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Utilisez 'mysql2' si vous avez choisi MySQL
require('dotenv').config(); // Charge le fichier .env

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Configuration de la connexion à Aiven
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Requis par Aiven pour les connexions sécurisées cloud
  }
});

// Route de test pour vérifier la base de données
app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()'); // Requête SQL simple de test
    res.json({ message: "Connecté à Aiven avec succès !", time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Échec de la connexion à la base de données" });
  }
});

app.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});
