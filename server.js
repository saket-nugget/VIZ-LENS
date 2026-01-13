require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic Route (Health Check)
app.get('/', (req, res) => {
    res.json({ 
        status: 'VIZ-LENS Backend is Running', 
        timestamp: new Date().toISOString() 
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
