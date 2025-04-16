import { MusicNetwork } from './network-viz.js';

// Handle Spotify authentication
const loginButton = document.createElement('button');
loginButton.textContent = 'Login with Spotify';
loginButton.addEventListener('click', () => {
    window.location.href = '/login';
});

// Handle authentication error
const params = new URLSearchParams(window.location.hash.substring(1));
if (params.get('error')) {
    console.error('Authentication failed:', params.get('error'));
}

// Add login button to the page
document.querySelector('main').prepend(loginButton);

// Setup search functionality
const searchInput = document.getElementById('artist-search');
const searchResults = document.getElementById('search-results');

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length > 2) {
            const artist = await searchArtist(query);
            displaySearchResults(artist);
        } else {
            searchResults.innerHTML = '';
        }
    }, 300);
});

// Function to search artists
async function searchArtist(name) {
    try {
        const response = await fetch(`/api/artist?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        if (response.ok) {
            return data;
        } else {
            console.error('Error:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error searching artist:', error);
        return null;
    }
}

// Function to display search results
function displaySearchResults(artist) {
    if (!artist) {
        searchResults.innerHTML = '<p>No results found</p>';
        return;
    }

    const artistElement = document.createElement('div');
    artistElement.className = 'artist-result';
    artistElement.innerHTML = `
        <h3>${artist.name}</h3>
        ${artist.images?.[0]?.url ? `<img src="${artist.images[0].url}" alt="${artist.name}" style="width: 100px;">` : ''}
        ${artist.genres?.length ? `<p>Genres: ${artist.genres.join(', ')}</p>` : ''}
        <button onclick="exploreConnections('${artist.id}')">Explore Connections</button>
    `;

    searchResults.innerHTML = '';
    searchResults.appendChild(artistElement);
}

// Function to explore artist connections
window.exploreConnections = async function(artistId) {
    if (!artistId) {
        console.error('No artist ID provided');
        return;
    }
    
    try {
        const response = await fetch(`/api/artist/${artistId}/connections`);
        const connections = await response.json();
        if (response.ok) {
            // Initialize network visualization with connections
            const networkContainer = document.getElementById('network-container');
            // Clear previous visualization if any
            networkContainer.innerHTML = '';
            const networkViz = new MusicNetwork('network-container');
            networkViz.updateData(connections.nodes, connections.links);
        } else {
            console.error('Error:', connections.error);
        }
    } catch (error) {
        console.error('Error fetching connections:', error);
    }
};