# miaow.lol

miaow.lol is a pile of cat browser toys for the web. Some are noisy, some are soft, some are just weird little interaction experiments.

Play it at [miaow.lol](https://miaow.lol).

![Screenshot of the miaow.lol lobby](docs/readme-lobby.png)

This project was inspired by [tinyfingers.net](https://tinyfingers.net/).

## Running locally

```bash
npm install
npm run dev
```

Vite will print the local URL.

## Tests

```bash
npm test
```

## Project layout

- `src/App.jsx` holds the app shell, history handling, and the switch between the lobby and the active toy.
- `src/data/experiences.js` is the catalog of toys, including titles, descriptions, themes, and lazy imports.
- `src/toys/` contains the toy implementations.
- `src/components/` contains the lobby, player, share UI, and supporting pieces.
- `src/share.js` builds share URLs and payloads for each toy.
- `src/seo.js` updates the page title, meta description, and canonical URL.
- `src/html/` contains preview HTML used by individual toys.
- `audio/` contains the sound assets.

## Adding a toy

1. Add the toy component in `src/toys/`.
2. Add its metadata and loader in `src/data/experiences.js`.
3. Add preview HTML in `src/html/` if the toy needs it.
4. Run `npm test`.
