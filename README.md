# Economic Dashboard

## Data Source Setup (Google Sheets)

This app can load economic data directly from a Google Sheet CSV export.

1. Publish your sheet/tab so it can be read as CSV.
2. Create a `.env.local` file in the project root:

```bash
VITE_GOOGLE_SHEET_URL="https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit?gid=<TAB_GID>#gid=<TAB_GID>"
```

You can also provide a direct CSV export URL if you prefer.

If `VITE_GOOGLE_SHEET_URL` is unavailable or fails, the app falls back to:
- `public/data/economic_indicators.csv`
- Embedded CSV in `src/App.tsx` (last fallback)

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
