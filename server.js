const express = require('express');
const cors = require('cors'); // Import CORS middleware
const fetch = require('node-fetch'); // Import node-fetch for API calls
const app = express();

// Enable CORS for all routes
app.use(cors());

// Proxy endpoint for user details
app.get('/api/user/:id', async (req, res) => {
    const { id } = req.params;
    const apiUrl = `https://users.roblox.com/v1/users/${id}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch data from Roblox API' });
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy endpoint for avatar headshot
app.get('/api/avatar/:id', async (req, res) => {
    const { id } = req.params;
    const avatarApiUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=100x100&format=Png&isCircular=true`;

    try {
        const response = await fetch(avatarApiUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch avatar data from Roblox API' });
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching avatar data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
