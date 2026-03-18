"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrackInfoData = getTrackInfoData;
exports.getTrackInfo = getTrackInfo;
exports.getTrackRadioData = getTrackRadioData;
exports.getTrackRadio = getTrackRadio;
exports.getTrackByIsrcData = getTrackByIsrcData;
exports.getTrackByIsrc = getTrackByIsrc;
exports.getSimilarTracksData = getSimilarTracksData;
exports.getSimilarTracks = getSimilarTracks;
const auth_1 = require("./auth");
function formatDuration(isoDuration) {
    if (!isoDuration)
        return '';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match)
        return isoDuration;
    const h = match[1] ? `${match[1]}:` : '';
    const m = (match[2] ?? '0').padStart(h ? 2 : 1, '0');
    const s = (match[3] ?? '0').padStart(2, '0');
    return `${h}${m}:${s}`;
}
async function getTrackInfoData(trackId, client, countryCode) {
    const { data, error } = await client.GET('/tracks/{id}', {
        params: {
            path: { id: trackId },
            query: {
                countryCode,
                include: ['artists', 'albums'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get track info — ${JSON.stringify(error)}`);
    }
    const attrs = data.data?.attributes ?? {};
    const included = data.included ?? [];
    const artists = included
        .filter((item) => item.type === 'artists')
        .map((item) => item.attributes?.name ?? item.id);
    const album = included.find((item) => item.type === 'albums');
    const albumName = album?.attributes?.title ?? undefined;
    let coverUrl;
    if (album?.id) {
        try {
            const { data: artData } = await client.GET('/albums/{id}/relationships/coverArt', {
                params: {
                    path: { id: album.id },
                    query: { countryCode, include: ['coverArt'] },
                },
            });
            const artwork = (artData?.included ?? []).find((i) => i.type === 'artworks');
            const files = artwork?.attributes?.files ?? [];
            const preferred = files.find((f) => f.meta?.width === 640) ?? files[0];
            coverUrl = preferred?.href;
        }
        catch { }
    }
    return {
        id: trackId,
        title: attrs.title ?? 'Unknown',
        artists,
        album: albumName,
        duration: formatDuration(attrs.duration),
        isrc: attrs.isrc,
        bpm: attrs.bpm,
        key: attrs.key,
        popularity: attrs.popularity,
        explicit: attrs.explicit,
        coverUrl,
    };
}
async function getTrackInfo(trackId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const result = await getTrackInfoData(trackId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nTrack: [${result.id}] ${result.title}`);
        if (result.artists.length > 0)
            console.log(`  Artists: ${result.artists.join(', ')}`);
        if (result.album)
            console.log(`  Album: ${result.album}`);
        if (result.duration)
            console.log(`  Duration: ${result.duration}`);
        if (result.isrc)
            console.log(`  ISRC: ${result.isrc}`);
        if (result.bpm !== undefined)
            console.log(`  BPM: ${result.bpm}`);
        if (result.key !== undefined)
            console.log(`  Key: ${result.key}`);
        if (result.popularity !== undefined)
            console.log(`  Popularity: ${result.popularity}`);
        if (result.explicit !== undefined)
            console.log(`  Explicit: ${result.explicit}`);
        if (result.coverUrl)
            console.log(`  Cover: ${result.coverUrl}`);
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function getTrackRadioData(trackId, client, countryCode) {
    const { data, error } = await client.GET('/tracks/{id}/relationships/radio', {
        params: {
            path: { id: trackId },
            query: {
                countryCode,
                include: ['radio'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get track radio — ${JSON.stringify(error)}`);
    }
    const radioData = data.data ?? [];
    const included = data.included ?? [];
    return radioData.map((item) => {
        const incl = included.find((i) => i.id === item.id && i.type === 'playlists');
        const attrs = incl?.attributes ?? {};
        return {
            id: item.id,
            type: item.type,
            name: attrs.name,
            numberOfItems: attrs.numberOfItems,
        };
    });
}
async function getTrackRadio(trackId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const playlists = await getTrackRadioData(trackId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(playlists, null, 2));
            return;
        }
        if (playlists.length === 0) {
            console.log(`No radio found for track ${trackId}.`);
            return;
        }
        console.log(`\nRadio for track ${trackId}:\n`);
        for (const p of playlists) {
            console.log(`  [${p.id}] ${p.name ?? 'Radio Mix'}${p.numberOfItems ? ` (${p.numberOfItems} tracks)` : ''}`);
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function getTrackByIsrcData(isrc, client, countryCode) {
    const { data, error } = await client.GET('/tracks', {
        params: {
            query: {
                countryCode,
                'filter[isrc]': [isrc],
                include: ['artists'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get track by ISRC — ${JSON.stringify(error)}`);
    }
    const items = data.data ?? [];
    const included = data.included ?? [];
    return items.map((item) => {
        const attrs = item.attributes;
        const artistRels = item.relationships?.artists?.data ?? [];
        const artistNames = artistRels.map((rel) => {
            const artist = included.find((inc) => inc.type === 'artists' && inc.id === rel.id);
            return artist?.attributes?.name ?? rel.id;
        });
        return {
            id: item.id,
            title: attrs?.title ?? 'Unknown',
            artists: artistNames,
            duration: formatDuration(attrs?.duration),
            isrc: attrs?.isrc,
            popularity: attrs?.popularity,
        };
    });
}
async function getTrackByIsrc(isrc, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const tracks = await getTrackByIsrcData(isrc, client, countryCode);
        if (json) {
            console.log(JSON.stringify(tracks, null, 2));
            return;
        }
        if (tracks.length === 0) {
            console.log(`No tracks found for ISRC ${isrc}.`);
            return;
        }
        console.log(`\nTracks matching ISRC ${isrc}:\n`);
        for (const t of tracks) {
            const artistStr = t.artists.length > 0 ? ` by ${t.artists.join(', ')}` : '';
            const extras = [t.duration, t.popularity !== undefined ? `popularity: ${t.popularity}` : undefined]
                .filter(Boolean)
                .join(', ');
            console.log(`  [${t.id}] ${t.title}${artistStr}${extras ? ` (${extras})` : ''}`);
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function getSimilarTracksData(trackId, client, countryCode) {
    const { data, error } = await client.GET('/tracks/{id}/relationships/similarTracks', {
        params: {
            path: { id: trackId },
            query: {
                countryCode,
                include: ['similarTracks'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get similar tracks — ${JSON.stringify(error)}`);
    }
    const included = data.included ?? [];
    return included
        .filter((item) => item.type === 'tracks')
        .map((item) => {
        const attrs = item.attributes;
        return {
            id: item.id,
            title: attrs?.title ?? 'Unknown',
            duration: formatDuration(attrs?.duration),
            isrc: attrs?.isrc,
            popularity: attrs?.popularity,
        };
    });
}
async function getSimilarTracks(trackId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const tracks = await getSimilarTracksData(trackId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(tracks, null, 2));
            return;
        }
        if (tracks.length === 0) {
            console.log(`No similar tracks found for track ${trackId}.`);
            return;
        }
        console.log(`\nSimilar tracks to ${trackId}:\n`);
        for (const t of tracks) {
            const extras = [t.duration, t.popularity !== undefined ? `popularity: ${t.popularity}` : undefined]
                .filter(Boolean)
                .join(', ');
            console.log(`  [${t.id}] ${t.title}${extras ? ` (${extras})` : ''}`);
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=track.js.map