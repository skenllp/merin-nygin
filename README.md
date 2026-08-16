# Merin Elsa Roy & Nygin Thomas — Wedding Invitation

Mobile-first cinematic invitation. Plain HTML5, CSS3, and vanilla JavaScript.

```
UMESH_NEETHU/
├── assets/
│   ├── images/
│   │   ├── cover/          cover.png
│   │   ├── hero/           hero.png, hero-alt.png (+ optional .webp / .avif)
│   │   ├── gallery/        couple + gallery photos
│   │   ├── decorations/    section wash SVGs
│   │   └── icons/
│   ├── video/              invitation-reveal.mp4
│   ├── fonts/
│   └── audio/
├── css/
├── js/
├── ExtraInfo/              client refs, backups, unused files (not for production)
├── index.html
└── README.md
```

## Run

Serve the project root over HTTP (needed for video):

```powershell
python -m http.server 8080
```

Open <http://localhost:8080>.

## Production assets

| Role | Path |
|------|------|
| Landing cover | `assets/images/cover/cover.png` |
| Intro video | `assets/video/invitation-reveal.mp4` |
| Hero background | `assets/images/hero/hero-alt.png` (primary) / `hero.png` |
| Section washes | `assets/images/decorations/wash-*.svg` |

Optional optimised heroes: drop `hero.webp` / `hero.avif` into `assets/images/hero/` (convert script lives in `ExtraInfo/Backup/`).

Gallery / couple photos go in `assets/images/gallery/` as `01.jpg`…`09.jpg`, `groom.jpg`, `bride.jpg`.

## ExtraInfo

Anything not required to run the site (WhatsApp scans, PowerShell helpers, docs) is under `ExtraInfo/` so production stays clean.
