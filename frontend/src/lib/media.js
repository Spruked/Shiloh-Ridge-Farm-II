import { getBackendBaseUrl } from "./backend";

const ABSOLUTE_URL_PATTERN = /^(?:https?:|data:|blob:)/i;
const MEDIA_EXTENSIONS = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

function encodePathSegments(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function resolveMediaUrl(source) {
  if (!source || typeof source !== "string") {
    return null;
  }

  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const backendBaseUrl = getBackendBaseUrl();

  if (
    trimmed.startsWith("/images/") ||
    trimmed.startsWith("/documents/") ||
    trimmed.startsWith("/butch_audio/")
  ) {
    return `${backendBaseUrl}${trimmed}`;
  }

  if (
    trimmed.startsWith("images/") ||
    trimmed.startsWith("documents/") ||
    trimmed.startsWith("butch_audio/")
  ) {
    return `${backendBaseUrl}/${encodePathSegments(trimmed)}`;
  }

  if (trimmed.startsWith("assets/images/")) {
    const filename = trimmed.slice("assets/images/".length);
    return `${backendBaseUrl}/images/${encodePathSegments(filename)}`;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (MEDIA_EXTENSIONS.test(trimmed)) {
    return `${backendBaseUrl}/images/${encodePathSegments(trimmed)}`;
  }

  return trimmed;
}
