import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  AlertTriangle,
  CalendarClock,
  Copy,
  ExternalLink,
  FileDown,
  MapPin,
  RefreshCw,
  Search,
} from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/buttons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import SkeletonLoader from "../../components/ui/SkeletonLoader";
import { toast } from "sonner";
import { getApiBaseUrl, getBackendBaseUrl } from "../../lib/backend";
import { resolveMediaUrl } from "../../lib/media";

const API = getApiBaseUrl();
const BACKEND_BASE_URL = getBackendBaseUrl();

const REVIEW_HELP_TEXT =
  "These captures were saved safely, but they still need Dominic to confirm the tag or supporting details.";

function ReviewQueuePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [registeringId, setRegisteringId] = useState(null);

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [
        item.id,
        item.temp_id,
        item.suggested_tag,
        item.capture_gps,
        ...(item.reasons || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [items, query]);

  async function fetchPendingReviews(showToast = false) {
    setLoading((current) => current && !refreshing);
    setRefreshing(true);

    try {
      const token = localStorage.getItem("admin_token");

      if (token === "demo-token-2025") {
        const demoItems = buildDemoReviewQueue();
        setItems(demoItems);
        if (showToast) {
          toast.success("Review queue refreshed");
        }
        return;
      }

      const response = await axios.get(`${API}/review/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setItems(Array.isArray(response.data) ? response.data : []);
      if (showToast) {
        toast.success("Review queue refreshed");
      }
    } catch (error) {
      console.error("Error fetching review queue:", error);
      toast.error("Could not load the review queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleGenerateRegistration(recordId) {
    try {
      setRegisteringId(recordId);
      const token = localStorage.getItem("admin_token");

      if (token === "demo-token-2025") {
        toast.success("Demo mode: registration PDF would open here");
        return;
      }

      const response = await axios.post(
        `${API}/capture/register/${recordId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const pdfPath = response.data?.pdf;
      if (pdfPath) {
        window.open(resolveMediaUrl(pdfPath), "_blank", "noopener,noreferrer");
        toast.success("Registration packet opened");
      } else {
        toast.error("Registration PDF was not returned");
      }
    } catch (error) {
      console.error("Error generating registration PDF:", error);
      toast.error("Could not generate the registration packet");
    } finally {
      setRegisteringId(null);
    }
  }

  async function handleCopy(text, label) {
    if (!text) {
      toast.error(`No ${label.toLowerCase()} to copy`);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  }

  const urgentCount = items.filter((item) => (item.confidence ?? 0) < 0.5).length;

  return (
    <div className="min-h-screen bg-[#f7f4ef] px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7b4b2a]">
              Livestock Review Queue
            </p>
            <h1 className="text-3xl font-bold text-[#3d5a3d]">Check flagged field captures</h1>
            <p className="max-w-3xl text-sm text-stone-600">{REVIEW_HELP_TEXT}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/admin/dashboard">
              <Button type="button" variant="outline">
                Back To Dashboard
              </Button>
            </Link>
            <Link to="/admin/livestock">
              <Button type="button" className="bg-[#3d5a3d] hover:bg-[#2d4a2d]">
                Open Livestock Manager
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-stone-200 shadow-md">
            <CardHeader className="pb-3">
              <CardDescription>Pending captures</CardDescription>
              <CardTitle className="text-3xl text-[#3d5a3d]">{items.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-stone-600">
              Captures waiting for a quick human check before Dominic treats them as fully trusted records.
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-md">
            <CardHeader className="pb-3">
              <CardDescription>Urgent attention</CardDescription>
              <CardTitle className="text-3xl text-[#7b4b2a]">{urgentCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-stone-600">
              These have especially low confidence and are the best place to start.
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-md">
            <CardHeader className="pb-3">
              <CardDescription>Operator shortcut</CardDescription>
              <CardTitle className="text-xl text-[#3d5a3d]">Review, then edit</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-stone-600">
              Use this queue to spot the issue, then open livestock management to finalize the record if needed.
            </CardContent>
          </Card>
        </div>

        <Card className="border-stone-200 shadow-md">
          <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
            <div className="relative md:max-w-md md:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by temp ID, GPS, reason, or suggested tag"
                className="pl-9"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fetchPendingReviews(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Queue
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <SkeletonLoader count={4} />
        ) : filteredItems.length === 0 ? (
          <Card className="border-stone-200 shadow-md">
            <CardContent className="space-y-3 p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f4e8] text-[#3d5a3d]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-[#3d5a3d]">No captures need review right now</h2>
              <p className="text-sm text-stone-600">
                New low-confidence captures will show up here automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5">
            {filteredItems.map((item) => {
              const confidence = typeof item.confidence === "number" ? item.confidence : 0;
              const imageUrl = resolveMediaUrl(item.photo_url);

              return (
                <Card key={item.id} className="border-stone-200 shadow-md">
                  <CardContent className="grid gap-5 p-6 lg:grid-cols-[240px,1fr]">
                    <div className="overflow-hidden rounded-2xl bg-stone-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.temp_id || item.id}
                          className="h-60 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-60 items-center justify-center text-sm text-stone-500">
                          No image preview
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-semibold text-[#3d5a3d]">
                              {item.temp_id || "Pending tag confirmation"}
                            </h2>
                            <Badge className={getConfidenceBadgeClass(confidence)}>
                              {formatConfidenceLabel(confidence)}
                            </Badge>
                          </div>
                          <p className="text-sm text-stone-600">
                            Record ID: <span className="font-medium text-stone-800">{item.id}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleCopy(item.id, "Record ID")}
                          >
                            <Copy className="h-4 w-4" />
                            Copy ID
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleGenerateRegistration(item.id)}
                            disabled={registeringId === item.id}
                          >
                            <FileDown className="h-4 w-4" />
                            {registeringId === item.id ? "Opening..." : "Registration PDF"}
                          </Button>
                          <Link to="/admin/livestock">
                            <Button type="button" className="gap-2 bg-[#3d5a3d] hover:bg-[#2d4a2d]">
                              <ExternalLink className="h-4 w-4" />
                              Open In Livestock
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm text-stone-600 md:grid-cols-3">
                        <InfoRow
                          icon={CalendarClock}
                          label="Captured"
                          value={formatTimestamp(item.captured_at)}
                        />
                        <InfoRow
                          icon={MapPin}
                          label="GPS"
                          value={item.capture_gps || "No GPS recorded"}
                        />
                        <InfoRow
                          icon={AlertTriangle}
                          label="Suggested tag"
                          value={item.suggested_tag || "Use current temp ID"}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#5f3216]">Why this was flagged</p>
                        <div className="flex flex-wrap gap-2">
                          {(item.reasons || []).length > 0 ? (
                            item.reasons.map((reason) => (
                              <Badge key={reason} variant="outline" className="border-[#d8c3af] bg-[#fdf7f1] text-[#7b4b2a]">
                                {reason}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline">Review requested</Badge>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-[#f7f4ef] p-4 text-sm text-stone-600">
                        <p className="font-medium text-[#3d5a3d]">Owner-friendly next step</p>
                        <p className="mt-1">
                          If the tag or lineage looks wrong, open livestock management, edit the record, and keep the corrected record there as the source of truth.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-stone-800">{value}</p>
    </div>
  );
}

function formatTimestamp(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatConfidenceLabel(value) {
  const percent = Math.round((value || 0) * 100);
  if (percent >= 80) {
    return `High ${percent}%`;
  }
  if (percent >= 50) {
    return `Medium ${percent}%`;
  }
  return `Low ${percent}%`;
}

function getConfidenceBadgeClass(value) {
  if (value >= 0.8) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (value >= 0.5) {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-rose-100 text-rose-800";
}

function buildDemoReviewQueue() {
  const saved = JSON.parse(localStorage.getItem("admin_livestock_data") || "[]");
  const flagged = saved
    .filter((item) => item.requires_review || item.status === "pending_review")
    .map((item) => ({
      id: item.id,
      temp_id: item.tag_number,
      photo_url: item.capture_photo_url || item.photos?.[0] || null,
      suggested_tag: item.tag_number,
      confidence: item.capture_confidence ?? 0.42,
      reasons: item.review_reasons || ["Demo record flagged for owner review"],
      capture_gps: item.capture_gps || null,
      captured_at: item.capture_timestamp || item.created_at || null,
    }));

  if (flagged.length > 0) {
    return flagged;
  }

  return [
    {
      id: "demo-review-1",
      temp_id: "TEMP-DEMO42",
      photo_url: `${BACKEND_BASE_URL}/images/katahdin-ram.jpg`,
      suggested_tag: "042",
      confidence: 0.38,
      reasons: ["Tag confidence 0.38 below threshold", "Registration number missing from current capture"],
      capture_gps: "32.3194,-90.1770",
      captured_at: new Date().toISOString(),
    },
  ];
}

export default ReviewQueuePage;
