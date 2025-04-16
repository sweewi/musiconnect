import dotenv from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';

dotenv.config();

export const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI
});

// Initialize with client credentials
export async function initializeApi() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        
        // Set up automatic token refresh
        setTimeout(initializeApi, (data.body['expires_in'] - 60) * 1000);
        console.log('Spotify API initialized successfully');
    } catch (error) {
        console.error('Error initializing Spotify API:', error);
        // Retry after 5 seconds if initialization fails
        setTimeout(initializeApi, 5000);
    }
}

// Validate artist ID format
function isValidSpotifyId(id) {
    return typeof id === 'string' && id.length === 22;
}

export async function getArtistInfo(artistName) {
    try {
        // Ensure we have a valid token
        if (!spotifyApi.getAccessToken()) {
            await initializeApi();
        }
        
        const data = await spotifyApi.searchArtists(artistName);
        if (!data.body.artists || data.body.artists.items.length === 0) {
            return null;
        }
        return data.body.artists.items[0];
    } catch (error) {
        console.error('Error getting artist info:', error);
        if (error.statusCode === 401) {
            // Token expired, reinitialize and retry
            await initializeApi();
            return getArtistInfo(artistName);
        }
        return null;
    }
}

export async function getArtist(artistId) {
    if (!isValidSpotifyId(artistId)) {
        console.error('Invalid Spotify artist ID:', artistId);
        return null;
    }

    try {
        // Ensure we have a valid token
        if (!spotifyApi.getAccessToken()) {
            await initializeApi();
        }
        
        const data = await spotifyApi.getArtist(artistId);
        return data.body;
    } catch (error) {
        console.error('Error getting artist:', error);
        if (error.statusCode === 401) {
            // Token expired, reinitialize and retry
            await initializeApi();
            return getArtist(artistId);
        }
        return null;
    }
}

export async function getRelatedArtists(artistId) {
    if (!isValidSpotifyId(artistId)) {
        console.error('Invalid Spotify artist ID:', artistId);
        return [];
    }

    try {
        // Ensure we have a valid token
        if (!spotifyApi.getAccessToken()) {
            await initializeApi();
        }
        
        const data = await spotifyApi.getArtistRelatedArtists(artistId);
        return data.body.artists || [];
    } catch (error) {
        console.error('Error getting related artists:', error);
        if (error.statusCode === 401) {
            // Token expired, reinitialize and retry
            await initializeApi();
            return getRelatedArtists(artistId);
        }
        return [];
    }
}

export async function getArtistTopTracks(artistId) {
    try {
        const data = await spotifyApi.getArtistTopTracks(artistId, 'US');
        return data.body.tracks;
    } catch (error) {
        console.error('Error getting top tracks:', error);
        return [];
    }
}

export async function getTracksAudioFeatures(trackIds) {
    try {
        const data = await spotifyApi.getAudioFeaturesForTracks(trackIds);
        return data.body.audio_features;
    } catch (error) {
        console.error('Error getting audio features:', error);
        return [];
    }
}

export async function getArtistAverageFeatures(artistId) {
    const topTracks = await getArtistTopTracks(artistId);
    if (topTracks.length === 0) return null;

    const trackIds = topTracks.map(track => track.id);
    const audioFeatures = await getTracksAudioFeatures(trackIds);
    
    if (audioFeatures.length === 0) return null;

    // Calculate average of each audio feature
    const features = ['danceability', 'energy', 'valence', 'tempo', 'acousticness', 'instrumentalness'];
    const averages = {};
    
    features.forEach(feature => {
        averages[feature] = audioFeatures.reduce((sum, track) => sum + (track[feature] || 0), 0) / audioFeatures.length;
    });

    return averages;
}

export function calculateSimilarityScore(features1, features2) {
    if (!features1 || !features2) return 0;

    const features = ['danceability', 'energy', 'valence', 'acousticness', 'instrumentalness'];
    const weights = {
        danceability: 1,
        energy: 1.5,
        valence: 1,
        acousticness: 1.2,
        instrumentalness: 1
    };

    let totalDiff = 0;
    let totalWeight = 0;

    features.forEach(feature => {
        const weight = weights[feature];
        const diff = Math.abs(features1[feature] - features2[feature]);
        totalDiff += diff * weight;
        totalWeight += weight;
    });

    // Convert to a similarity score (0-1, where 1 is most similar)
    return 1 - (totalDiff / totalWeight);
}