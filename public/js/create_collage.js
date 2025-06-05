// Globals
var msCollageSize = null;
var msSortBy = null;
var msTimeRange = null;

// Events
const onPageLoad = async () => {
    setTimeout(async() => {
        // Load collage settings first
        loadCollageSettings();

        let selectedSize = msCollageSize.items[msCollageSize.selectedIndex].value;
        let selectedTimeRange = msTimeRange.items[msTimeRange.selectedIndex].value;
        let selectedSortBy = msSortBy.items[msSortBy.selectedIndex].value;

        await generateSpotifyCollage(selectedSize, selectedTimeRange, selectedSortBy);
        
        // Render page content after fetching necessary data
        showPageContent();
    }, 500);
}

async function onDownloadClick() {
    console.log("Downloading collage...");

    const collage = document.querySelector(".collage");
    if (!collage) return;

    htmlToImage.toPng(collage)
        .then(function(dataUrl) {
            const link = document.createElement('a');
            link.download = `collageiefy-${self.crypto.randomUUID()}`;
            link.href = dataUrl;
            link.click();
        })
        .catch(function(error) {
            console.error('Error capturing image:', error);
        });
}

// Functions
function showPageContent() {
    const content = document.querySelector('.content');
    content.classList.remove('hidden');
    content.classList.add('flex');

    // Just for added UX experience xD
    const splash = document.querySelector('.splash-screen');
    splash.classList.add('hidden');
}

async function generateSpotifyCollage(size, timeRange, sortBy) {
    // Start api fetch here
    let trackLimit = size * size; // Size multiplied by itself 3*3 = track limit of 9
    let uniqueTracksOnly = document.querySelector("#cbDuplicateTracks").checked;

    const tracks = await getTopTracks({
        tracks: [],
        timeRange,
        offset: 0,
        limit: 50,
        uniqueTracksOnly,
        trackLimit
    });

    console.log("Total unique tracks fetched: " + tracks.length);

    if (tracks && tracks.length) {
        const sortedTracks = await sortTracks(tracks, sortBy);
        const images = getTrackImages(sortedTracks);
        createCollage(images, size);
    }
}

function showGenerateCollageLoad() {
    const collageGrid = document.querySelector("#collageGrid");
    collageGrid.classList.add('hidden');

    const collageLoader = document.querySelector("#collageLoader");
    collageLoader.classList.remove("hidden");
}

function closeGenerateCollageLoad() {
    const collageLoader = document.querySelector("#collageLoader");
    collageLoader.classList.add("hidden");

    const collageGrid = document.querySelector("#collageGrid");
    collageGrid.classList.remove('hidden');
}

function loadCollageSettings() {
    // Generate multiselect buttons
    msCollageSize = new MultiSelect("#msCollageSize", {
        isMultiSelect: false,
        selectedIndex: 0,
        items: [
            { label: '3x3', value: '3' },
            { label: '5x5', value: '5' },
            { label: '7x7', value: '7' },
            { label: '10x10', value: '10' },
        ],
        events: {
            onSelectedIndexChanged: async () => {
                let selectedSize = msCollageSize.items[msCollageSize.selectedIndex].value;
                let selectedTimeRange = msTimeRange.items[msTimeRange.selectedIndex].value;
                let selectedSortBy = msSortBy.items[msSortBy.selectedIndex].value;

                showGenerateCollageLoad();
                await generateSpotifyCollage(selectedSize, selectedTimeRange, selectedSortBy);
                closeGenerateCollageLoad();
            }
        }
    });

    msCollageSize.initializeMultiselect();

    msSortBy = new MultiSelect("#msSortBy", {
        isMultiSelect: false,
        selectedIndex: 0,
        items: [
            { label: "Popularity", value: "popularity" },
            { label: "Release Date", value: "release_date" },
            { label: "Album Name", value: "album_name" },
            { label: "Most Played", value: "most_played" },
        ],
        events: {
            onSelectedIndexChanged: async () => {
                let selectedSize = msCollageSize.items[msCollageSize.selectedIndex].value;
                let selectedTimeRange = msTimeRange.items[msTimeRange.selectedIndex].value;
                let selectedSortBy = msSortBy.items[msSortBy.selectedIndex].value;

                showGenerateCollageLoad();
                await generateSpotifyCollage(selectedSize, selectedTimeRange, selectedSortBy);
                closeGenerateCollageLoad();
            }
        }
    });

    msSortBy.initializeMultiselect();

    msTimeRange = new MultiSelect("#msTimeRange", {
        isMultiSelect: false,
        items: [
            { label: "Last 4 Months", value: "short_term" },
            { label: "Last 6 Months", value: "medium_term" },
            { label: "Last Year", value: "long_term" }
        ],
        events: {
            onSelectedIndexChanged: async () => {
                let selectedSize = msCollageSize.items[msCollageSize.selectedIndex].value;
                let selectedTimeRange = msTimeRange.items[msTimeRange.selectedIndex].value;
                let selectedSortBy = msSortBy.items[msSortBy.selectedIndex].value;

                showGenerateCollageLoad();
                await generateSpotifyCollage(selectedSize, selectedTimeRange, selectedSortBy);
                closeGenerateCollageLoad();
            }
        }
    });

    msTimeRange.initializeMultiselect();
}

function createCollage(images, size) {
    let collageLength = size * size;
    const parentDOM = document.querySelector("#collageGrid");
    
    if (parentDOM) {
        parentDOM.innerHTML = "";
        const fragment = document.createDocumentFragment();

        // Create grid wrapper with your collage class
        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'collage';
        gridWrapper.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

        // Create grid cells
        for (let i = 0; i < collageLength ; i++) {
            const grid = document.createElement("img");
            grid.src = images[i] || "/images/default-cover.jpg";
            grid.classList.add("collage-content");
            gridWrapper.appendChild(grid);
        }

        fragment.appendChild(gridWrapper);
        parentDOM.appendChild(fragment);
    }
}

// Spotify Web API utility functions
async function getTopTracks(configs) {
    try {
        let { timeRange, offset, limit, trackLimit, tracks, uniqueTracksOnly } = configs;
        const url = `/api/getTopTracks?time_range=${timeRange}&offset=${offset}&limit=${limit}`;
        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        tracks = [...tracks, ...result.items];
        if (uniqueTracksOnly) {
            tracks = filterUniqueTracks(tracks);
        }

        if (result.next && tracks.length < trackLimit) {
            configs.offset = offset + limit;
            configs.tracks = tracks;
            return await getTopTracks(configs);
        }

        // Return the accumulated tracks once all pages are fetched
        return tracks;
    } catch (ex) {
        console.error(`@getTopTracks Error: ${ex.message}`);

        const isOk = confirm("Token expired. Redirecting to login page now...");
        if (isOk) {
            window.location.href = "/";
        }
    }
}

function filterUniqueTracks(tracks) {
    const seen = new Set();
    return tracks.filter(track => {
        const isUnique = !seen.has(track.album.name);
        if (isUnique) seen.add(track.album.name);
        return isUnique;
    });
}

async function sortTracks(tracks, sortBy) {
    switch (sortBy) {
        case "popularity":
            return tracks.sort((a, b) => b.popularity - a.popularity);
            break;
        case "release_date":
            return tracks.sort((a, b) => new Date(b.album.release_date) - new Date(a.album.release_date));
            break;
        case "album_name":
            return tracks.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case "most_played":
            return tracks;
    }
}

function getTrackImages(tracks) {
    let images = [];
    tracks.forEach(track => {
        images.push(track.album.images[0].url);
    })
    return images;
}