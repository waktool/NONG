import express from 'express'; // Import Express
import cors from 'cors'; // Import CORS
import fetch from 'node-fetch'; // Import node-fetch

const app = express();

// Enable CORS
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

// Proxy endpoint for user details (single user)
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

// Proxy endpoint for batch avatar thumbnails
app.get('/v1/avatars', async (req, res) => {
    const userIds = req.query.userIds; // Get the `userIds` query parameter
    const size = req.query.size || '48x48'; // Optional size parameter
    const format = req.query.format || 'Png'; // Optional format parameter
    const isCircular = req.query.isCircular || 'false'; // Optional circular parameter

    if (!userIds) {
        return res.status(400).json({ error: 'Missing userIds parameter' });
    }

    const avatarApiUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userIds}&size=${size}&format=${format}&isCircular=${isCircular}`;

    try {
        const response = await fetch(avatarApiUrl);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch avatar data from Roblox API' });
        }
        const data = await response.json();
        res.json(data); // Respond with the fetched data
    } catch (error) {
        console.error('Error fetching avatar data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy endpoint for batch user details
app.post('/v1/users', async (req, res) => {
    const apiUrl = `https://users.roblox.com/v1/users`;
    const payload = req.body;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch batch user data from Roblox API' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching batch user data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy endpoint for clan data
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
