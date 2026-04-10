// main.js - Logic utama aplikasi Lirikfy

// ======================== STATE MANAGEMENT ========================
const States = {
    IDLE: 'IDLE',
    LOADING: 'LOADING',
    RESULTS: 'RESULTS',
    LYRICS: 'LYRICS',
    ERROR: 'ERROR'
};

let currentState = States.IDLE;

// DOM elements
const idleEl = document.getElementById('idleState');
const loadingEl = document.getElementById('loadingState');
const resultsEl = document.getElementById('resultsState');
const lyricsEl = document.getElementById('lyricsState');
const errorEl = document.getElementById('errorState');
const mainContent = document.getElementById('mainContent');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Global history untuk kembali dari lirik ke hasil
window.lastResultsData = null;

// ======================== STATE SETTER ========================
function setState(newState, data = null) {
    idleEl.classList.add('hidden');
    loadingEl.classList.add('hidden');
    resultsEl.classList.add('hidden');
    lyricsEl.classList.add('hidden');
    errorEl.classList.add('hidden');

    currentState = newState;

    switch (newState) {
        case States.IDLE:
            idleEl.classList.remove('hidden');
            break;
        case States.LOADING:
            loadingEl.classList.remove('hidden');
            break;
        case States.RESULTS:
            resultsEl.classList.remove('hidden');
            if (data) renderResults(data);
            break;
        case States.LYRICS:
            lyricsEl.classList.remove('hidden');
            if (data) renderLyrics(data);
            break;
        case States.ERROR:
            errorEl.classList.remove('hidden');
            break;
    }
    mainContent.scrollTo({ top: 0, behavior: 'smooth' });
}

// ======================== RENDER FUNCTIONS ========================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function renderResults(songsArray) {
    if (!songsArray || songsArray.length === 0) {
        setState(States.ERROR);
        return;
    }
    resultsEl.innerHTML = '';
    const listDiv = document.createElement('div');
    listDiv.className = 'results-list';

    songsArray.forEach(song => {
        const trackName = song.trackName || song.name || "Judul tidak diketahui";
        const artistName = song.artistName || "Artis tidak diketahui";
        const album = song.albumName || "";
        const lyricsRaw = song.plainLyrics || song.syncedLyrics || "";

        const card = document.createElement('div');
        card.className = 'song-card';
        card.innerHTML = `
            <div class="song-title">${escapeHtml(trackName)}</div>
            <div class="song-artist">${escapeHtml(artistName)}</div>
            ${album ? `<div class="song-album">📀 ${escapeHtml(album)}</div>` : ''}
            <div class="card-hint">🔍 Lihat lirik →</div>
        `;
        card.addEventListener('click', () => {
            showLyricsDirect(trackName, artistName, lyricsRaw);
        });
        listDiv.appendChild(card);
    });
    resultsEl.appendChild(listDiv);
}

function renderLyrics({ title, artist, lyrics, source = null }) {
    lyricsEl.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'lyrics-view';
    container.innerHTML = `
        <div class="lyrics-header">
            <button class="back-btn" id="backToResultsBtn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M15 18l-6-6 6-6"/>
                </svg>
                Kembali
            </button>
        </div>
        <div class="song-detail">
            <h2>${escapeHtml(title)}</h2>
            <div class="artist-badge">${escapeHtml(artist)}</div>
            ${source ? `<div style="font-size:10px; margin-top:8px; color:#7E7E7E;">sumber: ${source}</div>` : ''}
        </div>
        <div class="lyrics-box">${escapeHtml(lyrics).replace(/\n/g, '<br>')}</div>
        <button class="new-search-btn" id="newSearchFromLyrics">🔍 Cari lagu lain</button>
    `;
    lyricsEl.appendChild(container);

    document.getElementById('backToResultsBtn')?.addEventListener('click', () => {
        if (window.lastResultsData) {
            setState(States.RESULTS, window.lastResultsData);
        } else {
            setState(States.IDLE);
        }
    });

    document.getElementById('newSearchFromLyrics')?.addEventListener('click', () => {
        setState(States.IDLE);
        searchInput.value = '';
        window.lastResultsData = null;
    });
}

function showLyricsDirect(title, artist, lyrics) {
    if (!lyrics || lyrics.trim() === "") {
        lyrics = "Lirik tidak tersedia untuk lagu ini. Coba pilih versi lain.";
    }
    setState(States.LYRICS, { title, artist, lyrics, source: "Lirikfy" });
}

// ======================== API & FALLBACK ========================
async function fallbackFetch(query) {
    let artist = "", title = query;
    if (query.includes('-')) {
        const parts = query.split('-').map(s => s.trim());
        title = parts[0];
        artist = parts[1] || "";
    } else if (query.toLowerCase().includes(' by ')) {
        const parts = query.split(/\s+by\s+/i);
        title = parts[0];
        artist = parts[1] || "";
    }

    // 1. Coba lyrics.ovh
    try {
        let url = artist
            ? `${FALLBACK.LYRICS_OVH}/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
            : `${FALLBACK.LYRICS_OVH}/${encodeURIComponent(title)}`;
        let res = await fetch(url);
        if (res.ok) {
            let data = await res.json();
            if (data.lyrics) {
                return { type: 'single', title, artist: artist || "Unknown", lyrics: data.lyrics, source: "Lyrics.ovh" };
            }
        }
    } catch (e) {}

    // 2. Coba LRCLIB
    try {
        let searchTerm = artist ? `${title} ${artist}` : title;
        let searchRes = await fetch(`${FALLBACK.LRCLIB_SEARCH}?q=${encodeURIComponent(searchTerm)}`);
        if (searchRes.ok) {
            let list = await searchRes.json();
            if (list && list.length) {
                let detailRes = await fetch(`${FALLBACK.LRCLIB_GET}/${list[0].id}`);
                if (detailRes.ok) {
                    let detail = await detailRes.json();
                    let lyric = detail.plainLyrics || detail.syncedLyrics;
                    if (lyric) {
                        return {
                            type: 'single',
                            title: detail.trackName,
                            artist: detail.artistName,
                            lyrics: lyric,
                            source: "LRCLIB"
                        };
                    }
                }
            }
        }
    } catch (e) {}

    return null;
}

async function performSearch(query) {
    if (!query || query.trim() === "") {
        setState(States.IDLE);
        return;
    }
    setState(States.LOADING);

    try {
        // 1. API utama Danzy
        const response = await fetch(`${CONFIG.DANZY_API}${encodeURIComponent(query)}`);
        if (response.ok) {
            const data = await response.json();
            if (data.status === true && data.result && Array.isArray(data.result) && data.result.length > 0) {
                window.lastResultsData = data.result;
                setState(States.RESULTS, data.result);
                return;
            }
        }

        // 2. Fallback ke single lyric
        const fallback = await fallbackFetch(query);
        if (fallback && fallback.lyrics) {
            setState(States.LYRICS, {
                title: fallback.title,
                artist: fallback.artist,
                lyrics: fallback.lyrics,
                source: fallback.source
            });
            window.lastResultsData = null;
            return;
        }

        // 3. Gagal total
        setState(States.ERROR);
    } catch (err) {
        console.error(err);
        setState(States.ERROR);
    }
}

// ======================== EVENT LISTENERS ========================
searchBtn.addEventListener('click', () => {
    performSearch(searchInput.value.trim());
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch(searchInput.value.trim());
    }
});

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-query');
        searchInput.value = val;
        performSearch(val);
    });
});

document.getElementById('errorRetryBtn').addEventListener('click', () => {
    const lastQuery = searchInput.value.trim();
    if (lastQuery) performSearch(lastQuery);
    else setState(States.IDLE);
});

// Inisialisasi awal
window.addEventListener('load', () => {
    setState(States.IDLE);
});
