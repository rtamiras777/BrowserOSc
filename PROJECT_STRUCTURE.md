# BrowserOS Project Structure Documentation

**Generated**: 2025-12-03
**Purpose**: Comprehensive context document for understanding the BrowserOSc codebase

---

## Executive Summary

**BrowserOS** is an open-source, AI-powered Chromium fork that runs AI agents natively in the browser. It's a monorepo containing:
- **BrowserOS Browser** (C++/Python) - Custom Chromium build
- **BrowserOS Agent** (TypeScript/React) - Chrome extension with AI automation features

The project is privacy-first, allowing users to bring their own API keys or run local models with Ollama. It serves as an open-source alternative to ChatGPT Atlas, Perplexity Comet, and Arc Browser.

---

## Directory Structure

```
/Users/ridhi/Documents/browserOS2/BrowserOSc/
├── packages/
│   ├── browseros/                 # Custom Chromium build system
│   └── browseros-agent/           # Chrome extension (main focus)
├── docs/                          # Comprehensive documentation
├── scripts/                       # Build and utility scripts
├── signatures/                    # Code signing and CLA
├── .github/                       # CI/CD workflows
└── [config files]                 # Git, VS Code, etc.
```

---

## Core Package: browseros-agent

### High-Level Architecture

```
packages/browseros-agent/
├── src/
│   ├── lib/                       # Core logic (113 TypeScript files)
│   ├── sidepanel/                 # Main UI (React + Tailwind)
│   ├── newtab/                    # New tab page
│   ├── options/                   # Settings page
│   ├── onboarding/                # Onboarding flow
│   ├── background/                # Service worker
│   ├── content/                   # Content scripts
│   └── evals2/                    # Evaluation framework
├── dist/                          # Build output
├── manifest.json                  # Chrome extension manifest v3
├── webpack.config.js              # Build configuration
├── CLAUDE.md                      # Comprehensive dev guidelines
└── package.json                   # Dependencies & scripts
```

### Technology Stack

**Frontend**
- React 18.2 + TypeScript 5.3
- Tailwind CSS 3.4 (no CSS modules/SCSS)
- Zustand 4.4 (state management)
- Radix UI 3.2 + Lucide Icons
- Webpack 5.89 with ts-loader

**Core Agent Logic**
- LangChain (multi-provider LLM abstraction)
- Anthropic Claude, OpenAI GPT-4, Ollama, Google Gemini, OpenRouter
- Zod 3.22 (schema validation)
- Puppeteer-core (browser automation)

**Testing & Build**
- Vitest 1.6 with happy-dom
- ESLint 8.56
- TypeScript strict mode

---

## Core Components Deep Dive

### 1. Agent System (`src/lib/agent/`)

**BrowserAgent.ts** (66KB) - Unified agent orchestration
- Classifies tasks as simple vs complex
- Routes simple tasks directly to tools
- Uses Planner tool for complex multi-step tasks
- Manages conversation history
- Handles streaming responses
- Iterative re-planning on failures

**Other Agents**:
- `LocalAgent.ts` - Local-only execution
- `ChatAgent.ts` - Chat-specific logic
- `TeachAgent.ts` - Recording/teaching mode
- `PreprocessAgent.ts` - Input preprocessing
- `WebSocketAgent.ts` - Remote agent via WebSocket

### 2. Tool System (`src/lib/tools/`)

**40+ Automation Tools** managed by `ToolManager.ts`:

**Navigation & Tabs**
- Navigate, TabOpen, TabFocus, TabClose, Tabs
- GetSelectedTabs, GroupTabsTool

**User Interaction**
- Click, Type, Clear, Scroll, Key, Wait
- VisualClick, VisualType (vision-based)
- ClickAtCoordinates, TypeAtCoordinates

**Data Extraction**
- Extract, GrepElements, PdfExtract
- Screenshot

**Task Management**
- Done, Celebration
- TodoGet, TodoSet
- Planner (multi-step planning)

**Advanced**
- MCPTool (Model Context Protocol)
- BrowserOSInfoTool, DateTool, HumanInput

### 3. Browser Automation (`src/lib/browser/`)

**BrowserContext.ts** - Multi-tab management
- Chrome debugger protocol attachment
- Tab selection and switching
- Anti-detection measures
- Proper cleanup and error handling

**BrowserPage.ts** - Page operations
- DOM manipulation
- Element interaction
- Navigation control

**ElementFormatter.ts** - DOM element formatting
- Converts DOM elements to LLM-readable format
- Provides context for tool execution

### 4. LLM Integration (`src/lib/llm/`)

**LangChainProvider.ts** - Multi-provider abstraction
- Anthropic Claude (claude-3-5-sonnet, opus, haiku)
- OpenAI (gpt-4, gpt-4o, gpt-4o-mini)
- Ollama (local models)
- Google Gemini (gemini-pro, gemini-1.5-pro)
- OpenRouter (multi-provider gateway)

**Features**:
- Token counting
- Streaming support
- Structured output with Zod schemas
- Tool binding for function calling

### 5. Runtime System (`src/lib/runtime/`)

**ExecutionContext.ts** - Central execution state
- Browser context management
- LLM provider instance
- Messaging ports
- Execution options (streaming, visibility, etc.)

**MessageManager.ts** - Conversation history
- Message persistence
- Context window management
- Message formatting for LLMs

**PortMessaging.ts** - Extension messaging
- Inter-context communication
- Event broadcasting
- Port management

**TodoStore.ts** - Task management
- Complex task breakdown
- Step tracking
- Progress updates

**StorageManager.ts** - Persistent storage
- Chrome storage API wrapper
- Settings persistence
- Session management

### 6. Services (`src/lib/services/`)

**TeachModeService.ts** - Recording system
- Captures user actions
- Generates automation scripts
- Playback functionality

**PdfService.ts** - PDF handling
- PDF extraction using PDF.js
- MinerU pipeline integration
- Text and image extraction

**GlowAnimationService.ts** - Visual feedback
- Highlights elements during automation
- Provides user feedback

**PlanGeneratorService.ts** - Planning logic
- Multi-step plan generation
- Task decomposition
- Execution orchestration

### 7. MCP Integration (`src/lib/mcp/`)

**KlavisAPIClient.ts** & **KlavisAPIManager.ts**
- Model Context Protocol support
- External tool integration
- Server communication

---

## UI Components

### Side Panel (`src/sidepanel/`)

Primary user interface with 30+ React components:

**Core Components**:
- `Chat.tsx` - Main chat interface
- `ChatInput.tsx` - Message input with file upload
- `MessageList.tsx` - Message display with streaming
- `Header.tsx` - Top navigation bar
- `SettingsModal.tsx` - Settings UI
- `ModeToggle.tsx` - Mode switching (chat, teach, etc.)
- `TaskManagerDropdown.tsx` - Task management UI

**State Management** (`stores/`):
- Zustand stores for global state
- Separate stores for settings, messages, tasks, UI state

**Styling**:
- Tailwind CSS utilities only
- Theme variables for colors
- Responsive design

### New Tab Page (`src/newtab/`)

Custom new tab page with:
- Agent management interface
- Quick access to tools
- Personalized content

### Options Page (`src/options/`)

Settings and preferences:
- LLM provider configuration
- API key management
- Feature toggles
- Privacy settings

### Onboarding (`src/onboarding/`)

Initial setup flow:
- Welcome screens
- API key setup
- Feature introduction
- Quick start guide

---

## Background Service Worker (`src/background/`)

**index.ts** - Thin orchestration layer

**Handlers** (`handlers/`):
- `ExecutionHandler.ts` - Task execution
- `MCPHandler.ts` - MCP server communication
- `TeachModeHandler.ts` - Recording system
- `SettingsHandler.ts` - Configuration management
- `ProvidersHandler.ts` - LLM provider management
- `PlanHandler.ts` - Planning logic
- `PDFHandler.ts` - PDF processing

**Router** (`router/`):
- Message routing between contexts
- Event dispatching

---

## Execution Flow

```
USER INTERACTION (Chrome)
         ↓
    Side Panel UI
    (React Components)
         ↓
  Background Service Worker
  (Message Router)
         ↓
  ┌─────────────────────────┐
  │  Execution Handler      │
  └─────────────────────────┘
         ↓
    BrowserAgent
  (Unified Agent)
         ↓
    ┌────────────────────────────┐
    │  Classification Tool       │
    │  (Simple vs Complex)       │
    └────────────────────────────┘
         ↓
    ┌─────────────┬──────────────┐
    ↓             ↓              ↓
 Simple       Complex          Chat
 Direct         Task          Mode
 Tool           ↓
 Execution   Planner Tool
    ↓        (Multi-step)
    │          ↓
    └─→ Tool Execution Loop
           ↓
       LangChain LLM
       (Tool Binding)
           ↓
    ┌──────────────────┐
    │  Tool Manager    │
    │  40+ Tools       │
    └──────────────────┘
           ↓
    BrowserContext
    (Puppeteer)
           ↓
    Browser Tab
    (Automation)
```

### Step-by-Step Flow

1. **User Input**: User enters query in side panel
2. **Message Routing**: Routes to background service worker
3. **Context Creation**: ExecutionHandler creates ExecutionContext
4. **Agent Execution**: BrowserAgent.execute() called
5. **Classification**: ClassificationTool determines task complexity
6. **Simple Tasks**: Direct tool execution
7. **Complex Tasks**: PlannerTool creates 3-5 step plan
8. **Tool Invocation**: Tools invoked iteratively via LangChain
9. **Results Aggregation**: Results collected and formatted
10. **UI Update**: Real-time streaming via PubSub event bus

---

## Key Patterns & Conventions

### Type Safety
- Strict TypeScript everywhere
- Zod schemas for runtime validation
- No `any` types permitted
- Path aliases: `@/lib` instead of relative paths

### Naming Conventions
- **Classes**: PascalCase (e.g., `BrowserAgent`)
- **Functions/variables**: camelCase (e.g., `executeTask`)
- **Constants**: UPPERCASE (e.g., `MAX_RETRIES`)
- **Private methods**: `_methodName` (e.g., `_handleError`)
- **Components (.tsx)**: PascalCase (e.g., `ChatInput.tsx`)
- **Utilities (.ts)**: lowercase (e.g., `formatting.ts`)

### Code Organization
- Files < 20 lines per function
- Single responsibility principle
- Guard clauses for early returns
- Extracted helper functions over duplication
- Inline comments, not JSDoc for properties

### State Management
- Zustand for global state
- React Context for tree-wide sharing
- Controlled components for forms
- Props defined with Zod schemas

### Testing
- Vitest (not Jest)
- Tests in `*.test.ts` or `*.spec.ts` files
- Focus on behavior, not implementation
- Mock external dependencies

### Styling
- Tailwind CSS utilities only
- No CSS modules or SCSS
- Theme variables for colors
- Responsive prefixes (sm:, md:, lg:)

---

## Entry Points

### Extension Entry Points
- **Background Worker**: `src/background/index.ts`
- **Side Panel**: `src/sidepanel/index.tsx`
- **New Tab**: `src/newtab/index.tsx`
- **Options Page**: `src/options/index.tsx`
- **Onboarding**: `src/onboarding/index.tsx`

### Core Logic Entry Points
- **Main Agent**: `src/lib/agent/BrowserAgent.ts`
- **Tool Manager**: `src/lib/tools/ToolManager.ts`
- **LLM Provider**: `src/lib/llm/LangChainProvider.ts`

### Content Scripts
- `src/content/glow-animation.ts` - Visual feedback
- `src/content/teach-mode-recorder.ts` - Recording

### Webpack Build Outputs
- `dist/background.js` - Service worker
- `dist/sidepanel.js` - Side panel UI
- `dist/newtab.js` - New tab page
- `dist/options.js` - Settings page
- `dist/onboarding.js` - Onboarding flow

---

## Configuration Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension manifest v3 |
| `webpack.config.js` | Build configuration |
| `tsconfig.json` | TypeScript compiler settings |
| `vitest.config.ts` | Test configuration |
| `tailwind.config.js` | Tailwind CSS customization |
| `.env.example` | Environment variable template |
| `CLAUDE.md` | AI assistant guidelines (comprehensive) |
| `package.json` | Dependencies & npm scripts |
| `.eslintrc.json` | ESLint rules |
| `.cursorrules` | Cursor IDE specific rules |

---

## Build & Development

### Development Workflow
```bash
cd packages/browseros-agent
yarn install              # Install dependencies
yarn dev:watch            # Auto-rebuild on changes
```

### Production Build
```bash
yarn build                # Optimized production build
```

### Loading in Chrome
1. Navigate to `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select `dist/` folder

### Testing
```bash
yarn test                 # Run all tests
yarn test:watch           # Watch mode
yarn test:coverage        # Coverage report
```

### Linting
```bash
yarn lint                 # Check for issues
yarn lint:fix             # Auto-fix issues
```

---

## Documentation Structure (`docs/`)

```
docs/
├── index.mdx                     # Main documentation
├── llm-setup-guide.mdx           # LLM configuration
├── onboarding.mdx                # User onboarding
├── browseros-mcp/                # MCP integration guides
├── bring-your-own-keys/          # API key setup
│   ├── anthropic-claude.mdx
│   ├── openai.mdx
│   ├── google-gemini.mdx
│   └── openrouter.mdx
├── local-LLMs/                   # Local model setup
│   ├── ollama.mdx
│   ├── lm-studio.mdx
│   └── gpt-oss.mdx
├── integrations/                 # Platform integrations
│   └── n8n.mdx
├── images/                       # Screenshots & guides
├── videos/                       # Demo videos
├── logo/                         # Brand assets
└── docs.json                     # Documentation index
```

---

## Key Dependencies

### Production Dependencies
- `react` 18.2.0 - UI framework
- `typescript` 5.3.3 - Type safety
- `zod` 3.22.4 - Schema validation
- `zustand` 4.4.7 - State management
- `@langchain/anthropic` - Claude integration
- `@langchain/openai` - OpenAI integration
- `@langchain/google-genai` - Gemini integration
- `puppeteer-core` - Browser automation
- `pdfjs-dist` 5.4.0 - PDF processing
- `@radix-ui/*` - UI components
- `lucide-react` - Icons
- `tailwindcss` 3.4.1 - Styling

### Development Dependencies
- `webpack` 5.89.0 - Build tool
- `vitest` 1.6.0 - Testing framework
- `eslint` 8.56.0 - Linting
- `@types/*` - TypeScript definitions

---

## Project Metadata

- **License**: AGPL-3.0
- **Package Manager**: Yarn 1.22
- **Node Version**: 18+
- **Platform**: Chrome extension (Manifest v3)
- **Repository Size**: ~775MB (with node_modules)
- **Code Files**: 113+ TypeScript files in lib, 40+ tools
- **UI Components**: 30+ React components

---

## Important Files to Read

For understanding the codebase, read these files in order:

1. **CLAUDE.md** - Comprehensive development guidelines
2. **README.md** - Project overview and setup
3. **src/lib/agent/BrowserAgent.ts** - Core agent logic
4. **src/lib/tools/ToolManager.ts** - Tool registration
5. **src/background/index.ts** - Background orchestration
6. **src/sidepanel/components/Chat.tsx** - Main UI
7. **manifest.json** - Extension configuration

---

## Summary

BrowserOS is a **production-ready, sophisticated Chrome extension** that brings AI agent automation directly into the browser. Key highlights:

✅ **Unified agent architecture** - Flexible task handling
✅ **40+ automation tools** - Comprehensive browser control
✅ **Multi-provider LLM support** - Claude, OpenAI, Ollama, Gemini
✅ **Modern React UI** - Tailwind styling, real-time updates
✅ **Type-safe codebase** - TypeScript + Zod validation
✅ **Privacy-first design** - Local processing options
✅ **Clean architecture** - Clear separation of concerns
✅ **Comprehensive docs** - Extensive developer guides
✅ **Professional standards** - Testing, linting, strict conventions

The codebase demonstrates excellent software engineering practices with maintainability, extensibility, and developer experience as top priorities.
