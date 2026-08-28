# Production release — Tequila Run 5.7.3 + online leaderboard backend

## Game
Approved Tequila Run 5.7.3 production build.

## Online leaderboard
Added missing Vercel Function at `/api/leaderboard`.

Verification after deploy:
1. GET `/api/leaderboard` → 200 JSON.
2. POST a controlled test result.
3. GET again → submitted result is visible.
4. Open the game and verify status says online leaderboard is connected.
