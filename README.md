# tidal-cli

<p align="center">
  <a href="https://tidal-cli.lucaperret.ch">
    <img src="https://tidal-cli.lucaperret.ch/banner" alt="tidal-cli — Control Tidal from your terminal" width="100%" />
  </a>
</p>

[![npm](https://img.shields.io/npm/v/@lucaperret/tidal-cli)](https://www.npmjs.com/package/@lucaperret/tidal-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/lucaperret/tidal-cli/ci.yml?label=tests)](https://github.com/lucaperret/tidal-cli/actions)
[![smithery badge](https://smithery.ai/badge/lucaperret/tidal)](https://smithery.ai/servers/lucaperret/tidal)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](https://nodejs.org)

## About

tidal-cli wraps the [Tidal API v2](https://developer.tidal.com) into a single command-line tool. Search the catalog, manage playlists, explore artists, play tracks, and handle your library — all without opening a browser. Every command supports `--json` output, making it the backbone for LLM agent automation through [OpenClaw](https://openclaw.ai).

## Features

- **Search** artists, albums, tracks, videos, playlists, and autocomplete suggestions
- **Artists** — info, top tracks, discography, similar artists, radio
- **Albums** — details, barcode lookup
- **Tracks** — info, similar tracks, ISRC lookup, radio
- **Playlists** — full CRUD, add/remove tracks, reorder, add entire albums
- **Library** — favorites for artists, albums, tracks, videos, playlists
- **Playback** — stream info, direct URLs, local playback via DASH
- **Recommendations** — personalized mixes (My Mix, Discovery, New Arrivals)
- **History** — recently added tracks, albums, artists
- **JSON output** on every command for scripting and agent use

## Installation

```bash
npm install -g @lucaperret/tidal-cli
```

### Requirements

- Node.js >= 20
- A [Tidal](https://tidal.com) account

## Quick Start

```bash
# Sign in once — opens your browser
tidal-cli auth

# Search for a track
tidal-cli search track "Around the World"

# Get artist details
tidal-cli artist info 8992

# Play a track
tidal-cli playback play 5756235
```

## Usage

### Search

```bash
tidal-cli search artist "Gorillaz"
tidal-cli search album "Mezzanine"
tidal-cli search track "Teardrop"
tidal-cli search video "Stylo"
tidal-cli search playlist "Electronic"
tidal-cli search suggest "daft punk"
tidal-cli search editorial "indie rock"
```

### Artist

```bash
tidal-cli artist info <id>
tidal-cli artist tracks <id>
tidal-cli artist albums <id>
tidal-cli artist similar <id>
tidal-cli artist radio <id>
```

### Album & Track

```bash
tidal-cli album info <id>
tidal-cli album barcode <ean>
tidal-cli track info <id>
tidal-cli track similar <id>
tidal-cli track isrc <isrc>
tidal-cli track radio <id>
```

### Playlists

```bash
tidal-cli playlist list
tidal-cli playlist create --name "Late Night Electronic"
tidal-cli playlist add-track --playlist-id <id> --track-id <id>
tidal-cli playlist add-album --playlist-id <id> --album-id <id>
tidal-cli playlist remove-track --playlist-id <id> --track-id <id>
tidal-cli playlist move-track --playlist-id <id> --track-id <id> --before <itemId>
tidal-cli playlist rename --playlist-id <id> --name "New Name"
tidal-cli playlist set-description --playlist-id <id> --desc "Updated description"
tidal-cli playlist delete --playlist-id <id>
```

### Library

```bash
tidal-cli library add --track-id <id>
tidal-cli library add --artist-id <id>
tidal-cli library add --album-id <id>
tidal-cli library add --video-id <id>
tidal-cli library remove --track-id <id>
tidal-cli library favorite-playlists
tidal-cli library add-playlist --playlist-id <id>
tidal-cli library remove-playlist --playlist-id <id>
```

### Discovery & History

```bash
tidal-cli recommend
tidal-cli history tracks
tidal-cli history albums
tidal-cli history artists
tidal-cli user profile
```

### Playback

```bash
tidal-cli playback play <id>
tidal-cli playback play <id> --quality LOSSLESS
tidal-cli playback info <id>
tidal-cli playback url <id>
```

Quality options: `LOW`, `HIGH`, `LOSSLESS`, `HI_RES`.

## JSON Output

Add `--json` before any subcommand:

```bash
tidal-cli --json search track "Around the World"
tidal-cli --json playlist list
tidal-cli --json artist similar 8992
```

## MCP Server (Claude Integration)

tidal-cli is available as a remote MCP server for [Claude Desktop](https://claude.ai), [Smithery](https://smithery.ai/servers/lucaperret/tidal), and any MCP-compatible client.

**Connect in Claude Desktop:**
1. Settings → Connectors → Add custom connector
2. Enter: `https://tidal-cli.lucaperret.ch/api/mcp`
3. Click "Connect" → log in to Tidal → done

32 tools with OAuth authentication, safety annotations, and 3 prompt templates.

## Agent Automation

tidal-cli is also available as an [OpenClaw](https://openclaw.ai) skill on [ClawHub](https://clawhub.ai/lucaperret/tidal-cli). Install it for your AI agent:

```bash
clawhub install tidal-cli
```

After `tidal-cli auth`, agents can run commands non-interactively with auto-refreshing tokens.

### Example prompts for your AI agent

- "Create a playlist with the best tracks from Daft Punk's Discovery album"
- "Find artists similar to Massive Attack and add their top tracks to my library"
- "What are my playlists? Add the new LCD Soundsystem album to the first one"
- "Play me something by Boards of Canada"
- "Build a 2000s indie rock playlist with The Strokes, Arctic Monkeys, and Interpol"

### Scripting patterns

```bash
# Search then act
TRACK=$(tidal-cli --json search track "Around the World" | jq -r '.[0].id')
tidal-cli playlist add-track --playlist-id <id> --track-id "$TRACK"

# Discovery: artist → similar → top tracks → playlist
ARTIST=$(tidal-cli --json search artist "Boards of Canada" | jq -r '.[0].id')
SIMILAR=$(tidal-cli --json artist similar "$ARTIST" | jq -r '.[0].id')
TRACK=$(tidal-cli --json artist tracks "$SIMILAR" | jq -r '.[0].id')
tidal-cli playlist add-track --playlist-id <id> --track-id "$TRACK"
```

## Development

```bash
git clone https://github.com/lucaperret/tidal-cli.git
cd tidal-cli
npm install
npm run build
npm test
```

### Running Tests

```bash
npm test           # run once
npm run test:watch # watch mode
```

111 tests covering search, playlists, artists, tracks, albums, library, auth, and session.

## License

tidal-cli is licensed under the MIT License. See the [`LICENSE`](LICENSE) file for details.
