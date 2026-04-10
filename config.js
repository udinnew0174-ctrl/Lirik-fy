// config.js - Konstanta API dan konfigurasi aplikasi
const CONFIG = {
    DANZY_API: "https://api.danzy.web.id/api/search/lyrics?q=",
    LYRICS_OVH_API: "https://api.lyrics.ovh/v1",
    LRCLIB_API: "https://lrclib.net/api"
};

// Fallback endpoints (digunakan di main.js)
const FALLBACK = {
    LYRICS_OVH: CONFIG.LYRICS_OVH_API,
    LRCLIB_SEARCH: `${CONFIG.LRCLIB_API}/search`,
    LRCLIB_GET: `${CONFIG.LRCLIB_API}/get`
};
