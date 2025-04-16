const WIKI_API_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API_ENDPOINT = 'https://www.wikidata.org/w/api.php';

export async function searchWikipedia(artistName) {
    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: `${artistName} band musician`,
        origin: '*'
    });

    try {
        const response = await fetch(`${WIKI_API_ENDPOINT}?${params}`);
        const data = await response.json();
        return data.query.search[0];
    } catch (error) {
        console.error('Error searching Wikipedia:', error);
        return null;
    }
}

export async function getBandMembers(pageId) {
    const params = new URLSearchParams({
        action: 'parse',
        format: 'json',
        pageid: pageId,
        prop: 'wikitext',
        origin: '*'
    });

    try {
        const response = await fetch(`${WIKI_API_ENDPOINT}?${params}`);
        const data = await response.json();
        const wikitext = data.parse.wikitext['*'];
        
        // Extract band members from wikitext
        // This is a basic implementation - we'll need to enhance the parsing logic
        const memberMatches = wikitext.match(/\{\{former member\}\}|\{\{current member\}\}|members.*?=.*?\n/gi);
        return memberMatches ? parseMemberText(memberMatches) : [];
    } catch (error) {
        console.error('Error getting band members:', error);
        return [];
    }
}

function parseMemberText(memberMatches) {
    // Basic parsing of member information
    // This will need to be enhanced based on different wiki templates
    return memberMatches.map(match => {
        const memberInfo = match.split('=')[1];
        return memberInfo ? memberInfo.trim() : null;
    }).filter(Boolean);
}

export async function getArtistWikidata(wikipediaTitle) {
    // First, get the Wikidata ID from Wikipedia title
    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'pageprops',
        titles: wikipediaTitle,
        origin: '*'
    });

    try {
        const response = await fetch(`${WIKI_API_ENDPOINT}?${params}`);
        const data = await response.json();
        const pages = Object.values(data.query.pages);
        const wikidataId = pages[0]?.pageprops?.wikibase_item;

        if (!wikidataId) return null;

        // Then get structured data from Wikidata
        const wikidataParams = new URLSearchParams({
            action: 'wbgetentities',
            format: 'json',
            ids: wikidataId,
            props: 'claims',
            origin: '*'
        });

        const wikidataResponse = await fetch(`${WIKIDATA_API_ENDPOINT}?${wikidataParams}`);
        const wikidataData = await wikidataResponse.json();
        
        // Extract member information from Wikidata claims
        // P527 is the Wikidata property for "has part" which often includes band members
        const memberClaims = wikidataData.entities[wikidataId]?.claims?.P527 || [];
        return memberClaims.map(claim => claim.mainsnak.datavalue?.value?.id).filter(Boolean);
    } catch (error) {
        console.error('Error getting Wikidata:', error);
        return null;
    }
}