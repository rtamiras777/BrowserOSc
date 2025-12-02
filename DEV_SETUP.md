# BrowserOS Agent - Development Setup

## Quick Start Commands

### 1. Install Dependencies
```bash
cd packages/browseros-agent
yarn install
```

### 2. Setup Environment
```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your API key:
# LITELLM_API_KEY=your-key-here
```

### 3. Build & Development

**Development build (one-time):**
```bash
yarn dev
# or for Chrome specifically:
yarn dev:chrome
```

**Development build with auto-rebuild on file changes:**
```bash
yarn dev:watch
# This will automatically rebuild when you edit files
```

**Production build:**
```bash
yarn build
```

**Clean build artifacts:**
```bash
yarn clean
```

### 4. Load Extension in Chrome

1. Build the extension first (using one of the commands above)
2. Open Chrome: `chrome://extensions/`
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked**
5. Select the `packages/browseros-agent/dist/` folder
6. Extension is now loaded!

### 5. Making Changes

**Recommended workflow:**
```bash
# Terminal 1: Run watch mode
yarn dev:watch

# Make your code changes in src/
# The extension will auto-rebuild

# Terminal 2: Reload extension in Chrome
# Go to chrome://extensions/ and click the refresh icon on your extension
# OR use Cmd+R in the extension popup/sidepanel
```

## Testing Commands

```bash
# Run tests in watch mode
yarn test

# Run tests once
yarn test:run

# Run specific test file
yarn test -- path/to/file.test.ts

# Generate coverage report
yarn test:coverage

# Open test UI
yarn test:ui
```

## Linting

```bash
# Check for issues
yarn lint

# Auto-fix issues
yarn lint:fix
```

## Available Scripts Reference

| Command | Description |
|---------|-------------|
| `yarn install` | Install all dependencies |
| `yarn dev` | Development build |
| `yarn dev:watch` | Development build with auto-rebuild |
| `yarn build` | Production build |
| `yarn clean` | Remove dist folder |
| `yarn lint` | Check code style |
| `yarn lint:fix` | Fix code style issues |
| `yarn test` | Run tests in watch mode |
| `yarn test:run` | Run tests once |

## Project Structure

```
packages/browseros-agent/
├── src/                    # Source code
│   ├── lib/               # Core libraries
│   │   ├── agent/        # BrowserAgent
│   │   ├── browser/      # Browser context
│   │   ├── tools/        # Automation tools
│   │   └── llm/          # LLM integration
│   ├── sidepanel/        # UI - Side panel
│   ├── newtab/           # UI - New tab page
│   ├── background/       # Extension background script
│   └── content/          # Content scripts
├── dist/                  # Build output (created after build)
├── .env                   # Your environment variables
└── package.json           # Dependencies and scripts
```

## Tips

- **First time setup**: Run `yarn install` then `yarn dev:watch`
- **Daily development**: Keep `yarn dev:watch` running in a terminal
- **After changes**: Reload extension in Chrome to see updates
- **Debugging**: Open Chrome DevTools in the extension popup/sidepanel
- **Clean rebuild**: Run `yarn clean && yarn dev` if things act weird

## Troubleshooting

**Extension not loading?**
- Make sure you built it first (`yarn dev`)
- Point to the `dist/` folder, not the project root

**Changes not showing?**
- Reload the extension in `chrome://extensions/`
- Hard refresh the page where you're testing

**Yarn command not found?**
- Install Yarn globally: `npm install -g yarn`
