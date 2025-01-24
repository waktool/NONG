import express from 'express'; // Import Express
import cors from 'cors'; // Import CORS
import fetch from 'node-fetch'; // Import node-fetch

const app = express();

// Enable CORS
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

// New Proxy Endpoint for Clan Data
app.get('/api/clan/nong', async (req, res) => {
    const clanApiUrl = 'https://biggamesapi.io/api/clan/nong';

    try {
        const response = await fetch(clanApiUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch clan data from API' });
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching clan data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));
