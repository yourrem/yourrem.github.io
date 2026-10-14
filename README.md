# José Saavedra - personal site

A personal site styled after the Final Fantasy VII menu screen.

**Live:** https://yourrem.github.io/

It is a fully static site - plain HTML, CSS and JavaScript modules, with no
build step - so it can be hosted anywhere that serves files.

## Run locally

```bash
python3 serve.py
```

Then open http://localhost:8123. (`serve.py` is the standard Python file
server with caching turned off, so edits show up on reload.)

## Editing content

Everything on screen comes from [`data/site.json`](data/site.json): profile,
bio, menu, projects, skills, equipment, history, links, contact and resume.

| Path | What it holds |
| --- | --- |
| `index.html` | Page shell |
| `src/main.js` | State, routing and cursor navigation |
| `src/panels.js` | One render function per screen |
| `src/text.js`, `css/font.css` | Sprite-font text |
| `src/settings.js` | Config screen (window colours, sound, CRT effect) |
| `css/` | Layout and components |
| `assets/` | UI sprites, sounds, logos, icons, resume PDF |

## Controls

Arrow keys move the cursor, Enter confirms, Esc or Backspace goes back. The
mouse works everywhere too.

## Credits

Layout and UI sprites are modelled on [jamiepates.com](https://jamiepates.com).
Final Fantasy VII is the property of Square Enix; this is a non-commercial fan
homage. Brand icons are from [Simple Icons](https://simpleicons.org).
