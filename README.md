# Chain Lab

A compact, browser-friendly **chain-reaction puzzle**. You control a tiny maintenance
robot sealed inside a machine test chamber. Rearrange the signal modules so a single
push sends an energy pulse through the whole system and powers the **Final Core** _last_ —
which springs the exit hatch.

Built with **TypeScript** + **Vite**, rendered entirely on an HTML5 `<canvas>` with
procedural Web Audio sound (no asset downloads). Designed to feel at home on a portal
like CrazyGames: keyboard **and** touch controls, a clean premium HUD, a hint system,
and tutorial-style opening chambers.

## Gameplay

- **Left / Right** — turn, then walk
- **Up / Down** — climb rails
- **Grab / Drop** (`Z`) — pick up and place a module
- **Pulse** (`X`) — push the module in front of you to start the chain reaction
- **R** reset · **H** hint · **M** sound

The pulse activates one module at a time. Clear a chamber by making **every** module
activate, with the **Final Core** activating **last**.

### The modules

| Module             | Role                                                                 |
| ------------------ | ------------------------------------------------------------------- |
| **Relay Module**   | Activates and passes the pulse on to the next module in line.        |
| **Final Core**     | The goal — the pulse must reach it **last** to power the exit.       |
| **Firewall Block** | A hard wall. Can't be pushed and never activates; the pulse stops.   |
| **Timer Module**   | Holds the pulse for a moment, then releases it onward.               |
| **Splitter Node**  | Splits the pulse in two: one half forward, one half back.           |
| **Phase Module**   | Passes the pulse on, then phases out — leaving a gap.                |
| **Bridge Module**  | Extends a temporary floor across a one-tile gap, routing the pulse.  |
| **Blast Cell**     | Can't be pushed. When the pulse hits, it blasts out the floor below. |

## Project structure

```
chain-lab/
├── index.html              # Vite entry (game markup + overlays)
├── vite.config.ts          # Build config (GitHub Pages base path)
├── tsconfig.json
├── src/
│   ├── main.ts             # Bootstrap
│   ├── style.css           # HUD / overlay styling
│   ├── engine/             # Pure simulation — no DOM
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── parser.ts       # ASCII grid -> level
│   │   ├── simulate.ts     # Deterministic chain reaction
│   │   ├── levels.ts       # Chamber data (easy to edit)
│   │   └── index.ts
│   └── game/               # Browser layer
│       ├── Game.ts         # State, loop, input actions, playback
│       ├── render.ts       # All canvas drawing
│       ├── theme.ts        # Palette, module colours, icons
│       ├── audio.ts        # Procedural SFX
│       ├── particles.ts    # FX system
│       ├── hud.ts          # DOM HUD / overlays / power gauge
│       ├── input.ts        # Keyboard + touch wiring
│       ├── types.ts
│       └── util.ts
└── .github/workflows/deploy.yml   # GitHub Pages CI
```

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build

```bash
npm run build      # type-check + bundle to dist/
npm run preview    # serve the production build locally
```

## Authoring chambers

Chambers live in [`src/engine/levels.ts`](src/engine/levels.ts) as plain ASCII grids:

```
#  floor / wall      H  ladder / rung      D  exit hatch
@  robot start       .  empty air
o Relay   T Core   s Firewall   d Timer
p Splitter   v Phase   b Bridge   x Blast
```

Add an entry to the `LEVELS` array and it is picked up automatically.

## Deployment (GitHub Pages)

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
which type-checks, builds, and publishes `dist/` to GitHub Pages. The production base
path is derived from the repository name, so the site is served from
`https://<owner>.github.io/<repo>/`.

Enable it once under **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## License

MIT
