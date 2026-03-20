const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function getBackendBaseUrl() {
  const configured = (process.env.REACT_APP_BACKEND_URL || "").trim();

  if (configured) {
    try {
      const url = new URL(configured);
      if (typeof window !== "undefined") {
        const browserHost = window.location.hostname;
        if (browserHost && !LOCAL_HOSTS.has(browserHost) && LOCAL_HOSTS.has(url.hostname)) {
          url.hostname = browserHost;
        }
      }
      return url.toString().replace(/\/$/, "");
    } catch (error) {
      return configured.replace(/\/$/, "");
    }
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return "http://localhost:8000";
}

export function getApiBaseUrl() {
  return `${getBackendBaseUrl()}/api`;
}
