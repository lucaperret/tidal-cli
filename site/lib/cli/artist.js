"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtistInfoData = getArtistInfoData;
exports.getArtistInfo = getArtistInfo;
exports.getArtistRadioData = getArtistRadioData;
exports.getArtistRadio = getArtistRadio;
exports.getArtistTracksData = getArtistTracksData;
exports.getArtistTracks = getArtistTracks;
exports.getArtistAlbumsData = getArtistAlbumsData;
exports.getArtistAlbums = getArtistAlbums;
exports.getSimilarArtistsData = getSimilarArtistsData;
exports.getSimilarArtists = getSimilarArtists;
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
async function getArtistInfoData(artistId, client, countryCode) {
    const { data, error } = await client.GET('/artists/{id}', {
        params: {
            path: { id: artistId },
            query: {
                countryCode,
                include: ['biography'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get artist info — ${JSON.stringify(error)}`);
    }
    const attrs = data.data?.attributes ?? {};
    const included = data.included ?? [];
    const biographyItem = included.find((item) => item.type === 'artistBiographies');
    const biographyText = biographyItem?.attributes?.text ?? attrs.biography?.text ?? attrs.biography;
    return {
        id: artistId,
        name: attrs.name ?? 'Unknown',
        popularity: attrs.popularity,
        handle: attrs.handle,
        biography: biographyText,
    };
}
async function getArtistInfo(artistId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const result = await getArtistInfoData(artistId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nArtist: [${result.id}] ${result.name}`);
        if (result.handle)
            console.log(`  Handle: ${result.handle}`);
        if (result.popularity !== undefined)
            console.log(`  Popularity: ${result.popularity}`);
        if (result.biography)
            console.log(`  Biography: ${result.biography}`);
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function getArtistRadioData(artistId, client, countryCode) {
    const { data, error } = await client.GET('/artists/{id}/relationships/radio', {
        params: {
            path: { id: artistId },
            query: {
                countryCode,
                include: ['radio'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get artist radio — ${JSON.stringify(error)}`);
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
async function getArtistRadio(artistId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const playlists = await getArtistRadioData(artistId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(playlists, null, 2));
            return;
        }
        if (playlists.length === 0) {
            console.log(`No radio found for artist ${artistId}.`);
            return;
        }
        console.log(`\nRadio for artist ${artistId}:\n`);
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
async function getArtistTracksData(artistId, client, countryCode) {
    const { data, error } = await client.GET('/artists/{id}/relationships/tracks', {
        params: {
            path: { id: artistId },
            query: {
                countryCode,
                'collapseBy': 'FINGERPRINT',
                include: ['tracks'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get artist tracks — ${JSON.stringify(error)}`);
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
async function getArtistTracks(artistId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const tracks = await getArtistTracksData(artistId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(tracks, null, 2));
            return;
        }
        if (tracks.length === 0) {
            console.log(`No tracks found for artist ${artistId}.`);
            return;
        }
        console.log(`\nTracks for artist ${artistId}:\n`);
        for (const t of tracks) {
            console.log(`  [${t.id}] ${t.title}${t.popularity !== undefined ? ` (popularity: ${t.popularity})` : ''}`);
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function getArtistAlbumsData(artistId, client, countryCode) {
    const { data, error } = await client.GET('/artists/{id}/relationships/albums', {
        params: {
            path: { id: artistId },
            query: {
                countryCode,
                include: ['albums'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get artist albums — ${JSON.stringify(error)}`);
    }
    const included = data.included ?? [];
    return included
        .filter((item) => item.type === 'albums')
        .map((item) => {
        const attrs = item.attributes;
        return {
            id: item.id,
            title: attrs?.title ?? 'Unknown',
            albumType: attrs?.albumType,
            releaseDate: attrs?.releaseDate,
            numberOfItems: attrs?.numberOfItems,
        };
    });
}
async function getArtistAlbums(artistId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const albums = await getArtistAlbumsData(artistId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(albums, null, 2));
            return;
        }
        if (albums.length === 0) {
            console.log(`No albums found for artist ${artistId}.`);
            return;
        }
        console.log(`\nAlbums for artist ${artistId}:\n`);
        for (const a of albums) {
            const extras = [a.albumType, a.releaseDate, a.numberOfItems !== undefined ? `${a.numberOfItems} tracks` : undefined]
                .filter(Boolean)
                .join(', ');
            console.log(`  [${a.id}] ${a.title}${extras ? ` (${extras})` : ''}`);
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function getSimilarArtistsData(artistId, client, countryCode) {
    const { data, error } = await client.GET('/artists/{id}/relationships/similarArtists', {
        params: {
            path: { id: artistId },
            query: {
                countryCode,
                include: ['similarArtists'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get similar artists — ${JSON.stringify(error)}`);
    }
    const included = data.included ?? [];
    return included
        .filter((item) => item.type === 'artists')
        .map((item) => {
        const attrs = item.attributes;
        return {
            id: item.id,
            name: attrs?.name ?? 'Unknown',
            popularity: attrs?.popularity,
        };
    });
}
async function getSimilarArtists(artistId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const artists = await getSimilarArtistsData(artistId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(artists, null, 2));
            return;
        }
        if (artists.length === 0) {
            console.log(`No similar artists found for artist ${artistId}.`);
            return;
        }
        console.log(`\nSimilar artists to ${artistId}:\n`);
        for (const a of artists) {
            console.log(`  [${a.id}] ${a.name}${a.popularity !== undefined ? ` (popularity: ${a.popularity})` : ''}`);
        }
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
//# sourceMappingURL=artist.js.map