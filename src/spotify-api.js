import dotenv from 'dotenv';
import SpotifyWebApi from 'spotify-web-api-node';

dotenv.config();

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

export async function getArtistInfo(artistName) {
  try {
    const data = await spotifyApi.searchArtists(artistName);
    return data.body.artists.items[0];
  } catch (error) {
    console.error('Error getting artist info:', error);
    return null;
  }
}