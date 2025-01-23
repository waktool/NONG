const express = require('express'); // Import Express
const fetch = require('node-fetch'); // Import node-fetch (for Node.js < 18)
const app = express(); // Create an Express application instance

// Middleware to allow CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Proxy endpoint for user details
app.get('/api/user/:id', async (req, res) => {
    const { id } = req.params; // Extract the UserID from the URL
    const apiUrl = `https://users.roblox.com/v1/users/${id}`; // Target API URL

    try {
        const response = await fetch(apiUrl); // Fetch data from the Roblox API
        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch data from Roblox API' });
        }
        const data = await response.json(); // Parse the JSON response
        res.json(data); // Return the data to the client
    } catch (error) {
        console.error('Error fetching data:', error); // Log errors
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 3000; // Use the PORT environment variable or default to 3000
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`)); // Start the server
