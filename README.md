# Henri's Torture Gulag

**A physics human sandbox.** Spawn people. Grab them. Hit them with bats, rockets, lasers, black holes, anvils, chainsaws — watch limbs fly. Henri is watching.

Browser-only. Matter.js ragdolls + custom gore canvas.

## Play

```bash
cd games/henris-torture-gulag
python3 -m http.server 8780
```

**Live (iPad-friendly):** [https://fibonacciai.github.io/henris-torture-gulag/](https://fibonacciai.github.io/henris-torture-gulag/)

Repo: [github.com/FibonacciAi/henris-torture-gulag](https://github.com/FibonacciAi/henris-torture-gulag)

Local: **http://localhost:8780**

## Maps

Pick any arena from the map bar (switches world, clears inmates, re-spawns a batch):

| Map | Vibe |
|-----|------|
| 🏭 Gulag Basement | Classic rusty iron hellhole |
| 🧊 Arctic Freezer | Ice shelves, snow, chilly chaos |
| 🔥 Hellscape | Lava cracks, ash, heavy gravity |
| 🍬 Candy Chaos | Frosting floors, sugar mayhem |
| 🌕 Moon Base | **Low gravity** — yeet into orbit |
| 🦕 Dino Jungle | Trees, ruins, prehistoric platforms |
| 🎡 Haunted Carnival | Midnight midway madness |

World is ~2.3× wider than v1 (5600×1600) with multi-level platforms.

Inmates **try to stand** until you grab, yeet, or smash them. Hard flings no longer sink through the floor.

## People (kinds)

Each spawn / batch rolls a mix of types (size, HP, bounce, look):

| Kind | Notes |
|------|--------|
| 😐 Inmate | Standard |
| 👺 Goblin | Tiny, green |
| 💪 Bruiser | Huge tank |
| 💀 Skeleton | Fragile bones |
| 🤖 Robot | Sparks, not blood |
| 👽 Alien | Big head, floaty |
| 🥷 Ninja | Light & sneaky |
| 🤡 Clown | Super bouncy |
| 🧟 Zombie | Durable, green |
| 🟡 Rubber Dude | Physics rubber |
| 🎈 Balloon Kid | Almost flies |
| 🧙 Wizard | Pointy hat |
| 🛡️ Knight | Heavy armor |
| 🐔 Chicken Guy | Why not |
| 🦸 Super Dude | Cape energy |

## Controls

### Desktop
| Input | Action |
|-------|--------|
| **Middle-drag** (or Alt+left-drag) | Pan |
| **Scroll** | Zoom toward cursor |
| **Arrow keys** | Pan |
| **Left click** | Use tool |
| **Right-drag** | Grab & fling |
| **1–9 / 0** | Select tool |
| **Space** | Spawn |
| **C** | Batch |
| **Shift+R** | Purge |
| **Map bar** | Switch arena |

### Touch / iPad (multitouch)
| Gesture | Action |
|---------|--------|
| **1 finger** | Use selected tool (or grab with Hand) |
| **1 finger on empty (Hand)** | Pan |
| **2 fingers drag** | Pan |
| **Pinch** | Zoom |
| **2 fingers on bodies** | Grab two limbs at once |
| **Toolbar** | Pick tool (scrollable) |
| **Map bar** | Switch arena |

## Tools

Hand · Pistol · Shotgun · Bat · Sledge · Chainsaw · Rocket · Grenade · Mine · Flamethrower · Laser · Lightning · Anvil · Spikes · Slice · Black Hole

## Assets

| Folder | Contents |
|--------|----------|
| `assets/bg/` | Gulag / lab environment backdrop |
| `assets/body/` | Ragdoll part sprites (head, torso, limbs) |
| `assets/tools/` | 16 toolbar / HUD tool icons |
| `assets/props/` | World projectiles (rocket, grenade, mine, anvil, spikes) |
| `assets/ui/` | Logo + key art |
| `assets/fx/` | Blood splatter stamps |

## Stack

Pure HTML / CSS / Canvas. Matter.js via CDN. No build step. Art generated with Grok Imagine.
