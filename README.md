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

### Touch / iPad (multitouch)
| Gesture | Action |
|---------|--------|
| **1 finger** | Use selected tool (or grab with Hand) |
| **1 finger on empty (Hand)** | Pan |
| **2 fingers drag** | Pan |
| **Pinch** | Zoom |
| **2 fingers on bodies** | Grab two limbs at once |
| **Toolbar** | Pick tool (scrollable) |

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
