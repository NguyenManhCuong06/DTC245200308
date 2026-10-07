# Frontend Project Structure

**React / Next.js** — nguồn: zayan.dev.official (Build / Learn / Grow)

```
src/                              # Main source code folder
├── components/                   # Reusable UI components (buttons, cards, navbar)
├── pages/                        # Route-level page components
├── hooks/                        # Custom React hooks (useAuth, useFetch etc)
├── context/                      # Global state management (Context API/Redux)
├── services/ (or api/)           # API calls and backend communication logic
├── utils/                        # Helper functions (formatters, validators)
├── assets/                       # Static files
│   ├── images/                   # Images, logos, icons
│   └── fonts/                    # Custom fonts
├── styles/                       # Global CSS, Tailwind config, theme files
├── App.jsx                       # Root component, defines app layout/routes
└── main.jsx (or index.js)        # Entry point, renders App into the DOM
public/                           # Static files served directly (favicon, robots.txt)
.env                              # Environment variables (API keys, secrets)
.gitignore                        # Files/folders excluded from git
package.json                      # Project dependencies and scripts
README.md                         # Project documentation
tailwind.config.js                # Tailwind CSS configuration
vite.config.js                    # Vite build tool configuration
```

## Mô tả từng thư mục / file

| Đường dẫn | Mô tả |
|---|---|
| `src/` | Main source code folder |
| `components/` | Reusable UI components (buttons, cards, navbar) |
| `pages/` | Route-level page components |
| `hooks/` | Custom React hooks (useAuth, useFetch etc) |
| `context/` | Global state management (Context API/Redux) |
| `services/` (or `api/`) | API calls and backend communication logic |
| `utils/` | Helper functions (formatters, validators) |
| `assets/` | Static files |
| `assets/images/` | Images, logos, icons |
| `assets/fonts/` | Custom fonts |
| `styles/` | Global CSS, Tailwind config, theme files |
| `App.jsx` | Root component, defines app layout/routes |
| `main.jsx` (or `index.js`) | Entry point, renders App into the DOM |
| `public/` | Static files served directly (favicon, robots.txt) |
| `.env` | Environment variables (API keys, secrets) |
| `.gitignore` | Files/folders excluded from git |
| `package.json` | Project dependencies and scripts |
| `README.md` | Project documentation |
| `tailwind.config.js` | Tailwind CSS configuration |
| `vite.config.js` | Vite build tool configuration |
