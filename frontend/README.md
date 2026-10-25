# Shiloh Ridge Katahdins Frontend

React frontend for the Shiloh Ridge Katahdins website and customer/admin experience.

## Commands

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## API Resolution

Backend URL behavior lives in `src/lib/backend.js`.

Local browser sessions use:

```text
http://localhost:8000/api
```

Production sessions on `shilohridgekatahdins.com` use:

```text
https://api.shilohridgekatahdins.com/api
```

You can override the backend with:

```bash
REACT_APP_BACKEND_URL=http://localhost:8000 npm start
```

## Build Stack

- React
- Create React App via `react-scripts@5.0.1`
- CRACO
- Tailwind CSS
- Radix UI components
- Lucide icons

## Current Cleanup Notes

- The project now lives directly at `/home/bryan/projects/shilohridgekatahdins.com`.
- The old `Shiloh-Ridge-Farm-II` wrapper directory was removed.
- Homepage content was preserved while layout, icons, spacing, and build stability were cleaned up.
- Production build has been verified with `npm run build`.
