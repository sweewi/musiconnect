import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spotifyApi, initializeApi, getArtistInfo, getArtist, getRelatedArtists } from './spotify-api.js';
import { searchWikipedia, getBandMembers } from './wiki-api.js';

dotenv.config();

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Spotify API when server starts
initializeApi().catch(console.error);

// Serve static files from root directory
app.use(express.static(join(__dirname, '..')));

// Spotify auth routes
app.get('/login', (req, res) => {
    const scopes = [
        'user-read-private',
        'user-read-email',
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-top-read'
    ];
    try {
        const state = Math.random().toString(36).substring(7);
        const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
        res.redirect(authorizeURL);
    } catch (error) {
        console.error('Error creating login URL:', error);
        res.redirect('/#error=login_failed');
    }
});

app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!code) {
        return res.redirect('/#error=invalid_code');
    }

    try {
        const data = await spotifyApi.authorizationCodeGrant(code);
        const { access_token, refresh_token } = data.body;
        
        // Set the tokens
        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);

        // Set up token refresh before it expires
        const expires_in = data.body['expires_in'];
        setTimeout(() => {
            spotifyApi.refreshAccessToken().then(
                data => {
                    spotifyApi.setAccessToken(data.body['access_token']);
                },
                error => {
                    console.error('Could not refresh access token', error);
                }
            );
        }, (expires_in - 60) * 1000); // Refresh 1 minute before expiration

        res.redirect('/');
    } catch (error) {
        console.error('Error getting tokens:', error);
        res.redirect('/#error=auth_failed');
    }
});

// API endpoints
app.get('/api/artist', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ error: 'Artist name is required' });
    }
    try {
        const artistInfo = await getArtistInfo(name);
        if (!artistInfo) {
            return res.status(404).json({ error: 'Artist not found' });
        }
        res.json(artistInfo);
    } catch (error) {
        console.error('Error in /api/artist:', error);
        res.status(500).json({ error: 'Failed to fetch artist info' });
    }
});

app.get('/api/artist/:id/connections', async (req, res) => {
    const { id } = req.params;
    if (!id || id === 'undefined') {
        return res.status(400).json({ error: 'Valid artist ID is required' });
    }

    try {
        // Get artist info from Spotify
        const artist = await getArtist(id);
        if (!artist) {
            return res.status(404).json({ error: 'Artist not found' });
        }

        // Initialize nodes and links arrays
        const nodes = [{ 
            id: artist.id, 
            name: artist.name, 
            type: 'artist',
            images: artist.images
        }];
        
        const links = [];

        // Get related artists from Spotify
        const relatedArtists = await getRelatedArtists(id);
        
        // Add top 5 related artists
        relatedArtists.slice(0, 5).forEach(related => {
            nodes.push({
                id: related.id,
                name: related.name,
                type: 'related_artist',
                images: related.images
            });
            links.push({
                source: artist.id,
                target: related.id,
                type: 'similar_sound',
                score: 0.8
            });
        });

        // Search Wikipedia for band members
        const wikiResult = await searchWikipedia(artist.name);
        if (wikiResult) {
            const members = await getBandMembers(wikiResult.pageid);
            members.forEach((member, i) => {
                if (member && member.trim()) {
                    const memberId = `member-${i}`;
                    nodes.push({
                        id: memberId,
                        name: member.trim(),
                        type: 'member'
                    });
                    links.push({
                        source: artist.id,
                        target: memberId,
                        type: 'member_of'
                    });
                }
            });
        }

        res.json({ nodes, links });
    } catch (error) {
        console.error('Error in /api/artist/:id/connections:', error);
        res.status(500).json({ error: 'Failed to fetch artist connections' });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
});