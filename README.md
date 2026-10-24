# Soldier, How's Your Bomer?

A 16-bit style arena shooter that runs in the browser. One soldier, endless
waves of robots, and an ammo economy built on blue circles.

```
   soldier                 bullet                robot
     o                      8==D                 [o_o]
    /|\  ---------------->                       /| |\
```

## Play it

No build step and no dependencies. Either open `index.html` directly in a
browser, or serve the folder so the audio context behaves consistently:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Controls

| Action | Keys                  |
| ------ | --------------------- |
| Move   | Arrow keys or A / D   |
| Jump   | Space, Up arrow, or W |
| Fire   | J, X, or Z            |
| Start  | Enter                 |
| Pause  | P or Escape           |
| Music  | M (toggles on / off)  |

## How it works

- **The soldier** stands in a single-screen arena. Robots walk in from both
  edges, and drones fly in overhead.
- **Ammo is the whole game.** You start with 12 rounds. Every shot costs one.
  When a robot dies there is a 40% chance it drops a **blue cell**; walk over
  it to pick up 6 rounds (cap 99). Cells fade after about ten seconds, and
  blink before they disappear. With an empty clip the trigger just clicks and
  the HUD reads `NO AMMO`.
- **Bullets** are literally the text `8==D`, drawn in the game's bitmap font
  and mirrored when you fire to the left.
- **Robots.** Walkers take two hits, chase you, and stop to shoot at mid range.
  Drones take one hit, hover above you, and fire downward.
- **Difficulty** rises one level every 20 seconds: faster robots, more of them,
  and more drones.
- Three hearts. Touching a robot or eating a laser costs one, followed by a
  short invulnerability flicker. Best score is stored in `localStorage`.

## Soundtrack

Two mixes of **"Marching Through the Pain"** live in `audio/`. The title
screen loops mix 1. Starting a game switches to mix 2, and gameplay then
alternates between the two mixes so a long run hears both. The music ducks
under the game-over screen and comes back up on retry. Press M to toggle it;
the choice is remembered in `localStorage`.

Browsers refuse to start audio before the first user gesture, so the music
begins on the first key press. If you open `index.html` straight from disk
and hear nothing, serve the folder over HTTP instead (see above).

## Code tour

Everything lives in `game.js`, split into numbered sections:

1. Config and helpers. Canvas is 320x180 logical pixels, scaled up by an
   integer factor with `image-rendering: pixelated` for crisp pixels.
2. A 5x7 bitmap font used for the HUD, menus, and the `8==D` bullet.
3. Pixel-art sprites, defined as strings with one palette character per pixel
   and baked to offscreen canvases on first use.
4. A tiny WebAudio synth for shoot / hit / pickup / explosion sounds, and the
   soundtrack player (two MP3 tracks, title loop + alternating gameplay).
5. Entity constructors: player, robots, bullets, ammo cells, particles.
6. Game state and update logic (fixed 60 Hz timestep).
7. Rendering, including a pre-baked night-city background.
8. Input handling, canvas scaling, and the main loop.

`window.__bomer` exposes the game state for poking at from the console.

## Ideas for next steps

- Scrolling levels instead of a single arena.
- More robot types (a shielded tank, a bomber that drops mines).
- Weapon pickups that change the bullet string.
- Gamepad support.
- A proper sprite sheet instead of string-defined art.
