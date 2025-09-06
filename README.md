Monopoly Banker

A simple single-page static web app that tracks player bank balances for a Monopoly game.

Files
- `index.html` - main UI
- `style.css` - minimal styling
- `app.js` - application logic (setup, transaction parsing, display, reset)

How to use
1. Open `index.html` in a browser.
2. Set up players and their shortcodes (default players are pre-filled).
3. Click "Start Game".
4. Enter transactions like `z 100 g -200` and click "Apply" or press Enter.
5. Click "Reset" to return to setup.

Transaction rules
- Transactions are entered on a single line and may contain multiple instructions.
- Instructions are pairs of a player's single-character shortcode and an amount. Order doesn't matter.
- Numbers without a nearby valid shortcode are ignored; shortcodes without a number are ignored.
- Changes from a transaction are applied simultaneously and displayed with the change amount in parentheses if modified.
