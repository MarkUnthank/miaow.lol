# Goal Description
Migrate the `miaow.lol` landing page and HTML browser toys into a unified React application (using Vite + React). This transition will allow us to share assets, reduce redundancy, feature a heavily interactive 16:9 carousel, and implement unified overlay navigation for the experiences.

## User Review Required
Please confirm the following strategy for extracting the 15 separated HTML sources. To truly "share assets and reduce download sizes", I recommend converting the 15 `sources/*.html` files into 15 React functional components (using `useEffect` for the canvas logic). We will use `React.lazy` to code-split them so they only download when launched. 

Is this the approach you intended, or would you prefer a simpler `iframe`-based harness where the `sources/` remain completely separate HTML files? I strongly recommend the component conversion for maximum performance and asset sharing, but it is a larger structural change.

## Proposed Changes

### [NEW] Tooling & Setup
- Run `npx create-vite@latest ./ --template react` in the `miaow.lol` directory.
- Clear out boilerplate and move existing [index.html](file:///Users/markunthank/Developer/miaow.lol/index.html) over to the new structure.

### [NEW] React Components Layer
#### `App.jsx`
- Handle Application State (`isInLobby`, `currentExperienceIndex`, `isFullscreenModeOn`).
- Render the `Lobby` component or the `Player` component depending on the state.
- Smooth transitions built-in between states.

#### `Lobby.jsx` (Start Screen)
- Implement the "16:9" carousel cards with margin/spacing.
- Add large left & right visual arrows for scrolling.
- Add `keydown` event listeners for Left/Right arrow keys.
- Add the fullscreen toggle to the bottom-left, styled similarly to the "Surprise me" button.
- Dynamically alter the Global CSS Variables (Backgrounds, blobs) and Typography depending on the natively focused card's metadata.

#### `PlayerOverlay.jsx` (In-Game Overlay)
- A lightweight UI overlay sitting on top of the active experience.
- Renders:
  - **Back**: Returns to the `Lobby`.
  - **Previous**: Loads the sequentially previous toy.
  - **Next**: Loads a randomly selected toy.
  - **Fullscreen Toggle**: Displayed if the module is not currently fullscreen.

#### `toys/*.jsx` (Experience Modules)
- Convert the 15 HTML files currently in `sources` into isolated React components.
- Hoist shared resources (e.g., Font imports, global reset CSS, `window.AudioContext` initialization) into the root harness to eliminate duplicate downloads.

## Verification Plan
### Automated Tests
- Ensure `npm run dev` successfully builds the Vite React application without syntax or bundling errors.

### Manual Verification
- Open the application using the browser subagent.
- Verify 16:9 aspect ratio and large arrow availability.
- Test keyboard navigation (Left/Right arrows).
- Activate the "Fullscreen Toggle" -> Click "Play", verify the browser requests Fullscreen.
- Validate the Player overlay functionality (Back, Prev, Next buttons).
- Ensure background, fonts, and morphing blobs correctly change when focusing on different 16:9 toys in the Start Screen.
