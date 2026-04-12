# Sojourn

A local-first mission command environment. Runs entirely on a Raspberry Pi. Access from any browser on your home network.

## Prerequisites

Install on the Pi:

```bash
# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# libheif (for HEIC/iPhone photo support)
sudo apt-get install -y libheif-dev

# Claude Code CLI (open claw bot)
npm install -g @anthropic-ai/claude-code
```

## Setup

1. **Clone and install**
   ```bash
   git clone <repo> ~/sojourn
   cd ~/sojourn
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. **Build the client**
   ```bash
   cd ~/sojourn
   npm run build
   ```

3. **Create your config**
   ```bash
   cp sojourn.config.sample.json sojourn.config.json
   ```
   Edit `sojourn.config.json`:
   - `auth_token` — generate a long random string: `openssl rand -hex 32`
   - `vault_path` — absolute path to your Obsidian vault directory on the Pi
   - `storage_root` — where uploaded images will live (e.g. `/home/pi/sojourn-storage`)
   - `db_path` — where SQLite database lives (e.g. `/home/pi/sojourn.db`)

4. **Start the server**
   ```bash
   cd ~/sojourn
   ./start.sh
   ```

## Accessing Sojourn

Find your Pi's local IP:
```bash
hostname -I | awk '{print $1}'
```

Then open `http://<pi-ip>:3000` in any browser on your home WiFi — including your phone.

On login, enter your name and the `auth_token` from your config.

## Obsidian Vault Setup

Point `vault_path` at the root of your Obsidian vault directory on the Pi.

- Notes in the vault sync automatically into the Archive within ~2 seconds of saving.
- Notes you create in Sojourn's Archive are written to `<vault_path>/sojourn-inbox/` as `.md` files. These appear in Obsidian as a new folder.
- Sojourn never edits your existing Obsidian notes — only reads them.

**If your vault is on another machine**, sync it to the Pi first (e.g. via Syncthing, rsync, or iCloud Drive via `rclone`).

## Running as a Background Service

To keep Sojourn running after you close the terminal, install the systemd service:

```bash
sudo cp sojourn.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sojourn
sudo systemctl start sojourn
```

Check logs:
```bash
journalctl -u sojourn -f
```

## Development

Run server and client dev servers together:
```bash
npm run dev
```

Client runs on port 5173 (proxies `/api` and `/ws` to port 3000).
Server runs on port 3000.
