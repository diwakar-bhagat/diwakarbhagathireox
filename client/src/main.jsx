import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import store from './redux/store.js'

const CHUNK_RECOVERY_KEY = "__hireox_chunk_recovery__";

const forceFreshReload = () => {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(CHUNK_RECOVERY_KEY)) return;
    sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("v", String(Date.now()));
    window.location.replace(nextUrl.toString());
  } catch {
    window.location.reload();
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", () => {
    try {
      sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    } catch {
      // no-op
    }
  });

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    forceFreshReload();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const message =
      typeof reason === "string"
        ? reason
        : typeof reason?.message === "string"
          ? reason.message
          : "";

    if (
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("Importing a module script failed")
    ) {
      event.preventDefault();
      forceFreshReload();
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <Provider store={store}>
    <App />
    </Provider>
    </BrowserRouter>
  </StrictMode>,
)
