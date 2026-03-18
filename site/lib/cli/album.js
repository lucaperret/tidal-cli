"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlbumInfoData = getAlbumInfoData;
exports.getAlbumInfo = getAlbumInfo;
exports.getAlbumByBarcodeData = getAlbumByBarcodeData;
exports.getAlbumByBarcode = getAlbumByBarcode;
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
async function getAlbumInfoData(albumId, client, countryCode) {
    const { data, error } = await client.GET('/albums/{id}', {
        params: {
            path: { id: albumId },
            query: {
                countryCode,
                include: ['artists', 'coverArt'],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get album info — ${JSON.stringify(error)}`);
    }
    const attrs = data.data?.attributes ?? {};
    const included = data.included ?? [];
    const artists = included
        .filter((item) => item.type === 'artists')
        .map((item) => item.attributes?.name ?? item.id);
    const artwork = included.find((item) => item.type === 'artworks');
    const files = artwork?.attributes?.files ?? [];
    const preferred = files.find((f) => f.meta?.width === 640) ?? files[0];
    const coverUrl = preferred?.href;
    return {
        id: albumId,
        title: attrs.title ?? 'Unknown',
        artists,
        albumType: attrs.albumType,
        releaseDate: attrs.releaseDate,
        numberOfItems: attrs.numberOfItems,
        duration: formatDuration(attrs.duration),
        popularity: attrs.popularity,
        explicit: attrs.explicit,
        barcodeId: attrs.barcodeId,
        coverUrl,
    };
}
async function getAlbumInfo(albumId, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const result = await getAlbumInfoData(albumId, client, countryCode);
        if (json) {
            console.log(JSON.stringify(result, null, 2));
            return;
        }
        console.log(`\nAlbum: [${result.id}] ${result.title}`);
        if (result.artists.length > 0)
            console.log(`  Artists: ${result.artists.join(', ')}`);
        if (result.albumType)
            console.log(`  Type: ${result.albumType}`);
        if (result.releaseDate)
            console.log(`  Release Date: ${result.releaseDate}`);
        if (result.numberOfItems !== undefined)
            console.log(`  Tracks: ${result.numberOfItems}`);
        if (result.duration)
            console.log(`  Duration: ${result.duration}`);
        if (result.popularity !== undefined)
            console.log(`  Popularity: ${result.popularity}`);
        if (result.explicit !== undefined)
            console.log(`  Explicit: ${result.explicit}`);
        if (result.barcodeId)
            console.log(`  Barcode: ${result.barcodeId}`);
        if (result.coverUrl)
            console.log(`  Cover: ${result.coverUrl}`);
        console.log();
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
}
async function getAlbumByBarcodeData(barcode, client, countryCode) {
    const { data, error } = await client.GET('/albums', {
        params: {
            query: {
                countryCode,
                'filter[barcodeId]': [barcode],
            },
        },
    });
    if (error || !data) {
        throw new Error(`Failed to get album by barcode — ${JSON.stringify(error)}`);
    }
    const items = data.data ?? [];
    return items.map((item) => {
        const attrs = item.attributes;
        return {
            id: item.id,
            title: attrs?.title ?? 'Unknown',
            albumType: attrs?.albumType,
            releaseDate: attrs?.releaseDate,
            numberOfItems: attrs?.numberOfItems,
            duration: formatDuration(attrs?.duration),
            barcodeId: attrs?.barcodeId,
        };
    });
}
async function getAlbumByBarcode(barcode, json) {
    const client = await (0, auth_1.getApiClient)();
    const countryCode = await (0, auth_1.getCountryCode)();
    try {
        const albums = await getAlbumByBarcodeData(barcode, client, countryCode);
        if (json) {
            console.log(JSON.stringify(albums, null, 2));
            return;
        }
        if (albums.length === 0) {
            console.log(`No albums found for barcode ${barcode}.`);
            return;
        }
        console.log(`\nAlbums matching barcode ${barcode}:\n`);
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
//# sourceMappingURL=album.js.map