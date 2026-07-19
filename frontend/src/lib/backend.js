const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function resolvePublicBackendUrl(browserHost, protocol) {
  const normalizedHost = (browserHost || "").toLowerCase();

  if (!normalizedHost || LOCAL_HOSTS.has(normalizedHost)) {
    return "";
  }

  if (normalizedHost === "shilohridgekatahdins.com" || normalizedHost === "www.shilohridgekatahdins.com") {
    return `${protocol}//api.shilohridgekatahdins.com`;
  }

  return "";
}

export function getBackendBaseUrl() {
  const configured = (process.env.REACT_APP_BACKEND_URL || "").trim();

  if (configured) {
    try {
      const url = new URL(configured);
      if (typeof window !== "undefined") {
        const browserHost = window.location.hostname;
        const publicBackendUrl = resolvePublicBackendUrl(browserHost, window.location.protocol);
        if (publicBackendUrl && LOCAL_HOSTS.has(url.hostname)) {
          return publicBackendUrl;
        }
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
    const publicBackendUrl = resolvePublicBackendUrl(window.location.hostname, window.location.protocol);
    if (publicBackendUrl) {
      return publicBackendUrl;
    }
    if (LOCAL_HOSTS.has(window.location.hostname)) {
      return `${window.location.protocol}//${window.location.hostname}:12000`;
    }
    return `${window.location.protocol}//${window.location.hostname}`;
  }

  return "http://localhost:8000";
}

export function getApiBaseUrl() {
  return `${getBackendBaseUrl()}/api`;
}

export function adminAuthHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("admin_token") || ""}` };
}
