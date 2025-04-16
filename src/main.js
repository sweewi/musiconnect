import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spotifyApi, getArtistInfo } from './spotify-api.js';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Serve static files from root directory
app.use(express.static(join(__dirname, '..')));

// API endpoints
app.get('/api/artist', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: 'Artist name is required' });
    }
    try {
        const artistInfo = await getArtistInfo(name);
        res.json(artistInfo);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch artist info' });
    }
});

// Spotify auth routes
app.get('/login', (req, res) => {
    const scopes = [
        'user-read-private',
        'user-read-email',
        'playlist-read-private',
        'playlist-read-collaborative'
    ];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
});

app.get('/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
        res.redirect('/');
    } catch (error) {
        console.error('Error getting tokens:', error);
        res.redirect('/#error=auth_failed');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});