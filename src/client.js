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

// Function to search artists
async function searchArtist(name) {
    try {
        const response = await fetch(`/api/artist?name=${encodeURIComponent(name)}`);
        return await response.json();
    } catch (error) {
        console.error('Error searching artist:', error);
        return null;
    }
}