import { useEffect, useState, useCallback } from "react";
import {
  View, ScrollView, ActivityIndicator, Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { API } from "@/constants/api";
import { colors } from "@/theme/colors";
import { fmtDate } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportStatus = "pending" | "resolved" | "dismissed";

interface ReportTarget {
  id: number;
  title?: string;
  content?: string;
  name?: string;
}

interface Report {
  id: number;
  reporter_id: number;
  reporter_name: string;
  target_type: "listing" | "message" | "user";
  target_id: number;
  target: ReportTarget;
  reason: string;
  description?: string;
  status: ReportStatus;
  reviewed_by?: number;
  admin_note?: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function targetPreview(report: Report): string {
  const t = report.target;
  if (report.target_type === "listing") return t.title ?? `Listing #${t.id}`;
  if (report.target_type === "message") {
    const content = t.content ?? "";
    return content.length > 80 ? content.slice(0, 80) + "…" : content || `Message #${t.id}`;
  }
  return t.name ?? `User #${t.id}`;
}

function TargetBadge({ type }: { type: Report["target_type"] }) {
  const styleMap = {
    listing: { bg: colors.primaryLight, color: colors.primary },
    message: { bg: "#F0F0F0", color: colors.dark },
    user: { bg: colors.errorLight, color: colors.error },
  };
  const s = styleMap[type];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: s.color }}>{type}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const styleMap: Record<ReportStatus, { bg: string; color: string }> = {
    pending: { bg: "#FFF8E1", color: "#F57F17" },
    resolved: { bg: colors.successLight, color: colors.success },
    dismissed: { bg: "#F0F0F0", color: colors.dark },
  };
  const s = styleMap[status];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: s.color }}>{status}</Text>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

const LIMIT = 20;

export default function AdminScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { unreadCount } = useWebSocket();

  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<ReportStatus>("pending");
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [offset, setOffset] = useState(0);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"resolve" | "dismiss">("resolve");
  const [dialogReport, setDialogReport] = useState<Report | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = useCallback(async (status: ReportStatus, newOffset: number, append = false) => {
    if (!token) return;
    if (!append) setIsLoading(true);
    try {
      const res = await fetch(
        `${API.adminReports}?status=${status}&limit=${LIMIT}&offset=${newOffset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.reports) {
        setReports((prev) => append ? [...prev, ...data.reports] : data.reports);
        setTotal(data.total ?? 0);
      }
    } catch (err) {
      console.error("Admin reports fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchPendingCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        `${API.adminReports}?status=pending&limit=1&offset=0`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.total != null) setPendingCount(data.total);
    } catch (_) {}
  }, [token]);

  useEffect(() => {
    if (!user || !user.is_admin) return;
    setOffset(0);
    setReports([]);
    fetchReports(tab, 0);
    fetchPendingCount();
  }, [tab, fetchReports, fetchPendingCount, user]);

  const handleLoadMore = () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    fetchReports(tab, newOffset, true);
  };

  const openDialog = (report: Report, action: "resolve" | "dismiss") => {
    setDialogReport(report);
    setDialogAction(action);
    setAdminNote("");
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!dialogReport || !token) return;
    setSubmitting(true);
    try {
      const url = dialogAction === "resolve"
        ? API.adminReportResolve(dialogReport.id)
        : API.adminReportDismiss(dialogReport.id);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ admin_note: adminNote.trim() || undefined }),
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== dialogReport.id));
        setTotal((t) => Math.max(0, t - 1));
        if (tab === "pending") setPendingCount((c) => Math.max(0, c - 1));
        setDialogOpen(false);
      }
    } catch (err) {
      console.error("Admin action error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!user || !user.is_admin) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background gap-4"
        style={{ minHeight: "100vh" as any }}
      >
        <Ionicons name="lock-closed-outline" size={40} color={colors.mid} />
        <Text className="text-lg font-semibold text-foreground">Access denied</Text>
        <Button onPress={() => router.replace("/home")}>
          <Text>Go home</Text>
        </Button>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-background" style={{ minHeight: "100vh" as any }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* ── Nav bar ── */}
        <View className="bg-card border-b border-border px-6 py-3">
          <View
            className="flex-row items-center justify-between"
            style={{ maxWidth: 1100, marginHorizontal: "auto", width: "100%" }}
          >
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => router.push("/home")} className="flex-row items-center gap-1.5">
                <View className="bg-primary rounded px-1.5 py-0.5">
                  <Text className="text-xs font-bold text-primary-foreground">AM</Text>
                </View>
                <Text className="text-sm font-semibold text-foreground">Home</Text>
              </Pressable>
              <Ionicons name="chevron-forward" size={12} color={colors.mid} />
              <Text className="text-sm text-muted-foreground">Admin</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable
                className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center"
                onPress={() => router.push("/saved")}
              >
                <Ionicons name="heart-outline" size={16} color={colors.dark} />
              </Pressable>
              <Pressable
                className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center"
                onPress={() => router.push("/inbox")}
                style={{ position: "relative" as any }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.dark} />
                {unreadCount > 0 && (
                  <View style={{
                    position: "absolute", top: -4, right: -4,
                    backgroundColor: colors.primary, borderRadius: 100,
                    minWidth: 16, height: 16, paddingHorizontal: 3,
                    alignItems: "center", justifyContent: "center",
                    borderWidth: 1.5, borderColor: colors.white,
                  }}>
                    <Text style={{ color: colors.white, fontSize: 9, fontWeight: "700" }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                className="w-9 h-9 border-[1.5px] border-border rounded-lg items-center justify-center"
                onPress={() => router.push("/profile")}
              >
                <Ionicons name="person-outline" size={16} color={colors.dark} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Main content ── */}
        <View style={{ maxWidth: 1100, marginHorizontal: "auto", width: "100%", padding: 24 }}>

          {/* Header */}
          <View className="flex-row items-center gap-3 mb-6">
            <Text className="text-2xl font-bold text-foreground">Admin — Reports</Text>
            {pendingCount > 0 && (
              <View style={{
                backgroundColor: colors.error, borderRadius: 100,
                minWidth: 24, height: 24, paddingHorizontal: 8,
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ color: colors.white, fontSize: 12, fontWeight: "700" }}>
                  {pendingCount}
                </Text>
              </View>
            )}
          </View>

          {/* Tab pills */}
          <View className="flex-row gap-1 mb-5">
            {(["pending", "resolved", "dismissed"] as ReportStatus[]).map((t) => (
              <Pressable
                key={t}
                className="px-4 py-2 rounded-full"
                style={tab === t ? { backgroundColor: colors.primaryLight } : undefined}
                onPress={() => setTab(t)}
              >
                <Text
                  className="text-sm font-semibold capitalize"
                  style={{ color: tab === t ? colors.primary : colors.dark }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Content */}
          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : reports.length === 0 ? (
            <View className="items-center py-16 gap-3">
              <Ionicons name="checkmark-circle-outline" size={36} color={colors.mid} />
              <Text className="text-sm text-muted-foreground">No {tab} reports</Text>
            </View>
          ) : (
            <Card>
              {reports.map((report, idx) => (
                <View key={report.id}>
                  {idx > 0 && <View className="border-t border-border" />}
                  <View
                    className="flex-row items-start gap-4 px-5 py-4"
                    style={{ flexWrap: "wrap" as any }}
                  >
                    {/* Left: badge + preview + reason */}
                    <View className="gap-2" style={{ flex: 1, minWidth: 220 }}>
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <TargetBadge type={report.target_type} />
                        {tab !== "pending" && <StatusBadge status={report.status} />}
                      </View>
                      <Text className="text-sm font-medium text-foreground" numberOfLines={2}>
                        {targetPreview(report)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Reason: {report.reason}
                      </Text>
                      {report.description ? (
                        <Text className="text-xs text-muted-foreground" numberOfLines={2}>
                          {report.description}
                        </Text>
                      ) : null}
                      {report.admin_note ? (
                        <View
                          className="rounded-md px-3 py-2 mt-1"
                          style={{ backgroundColor: colors.successLight }}
                        >
                          <Text className="text-xs" style={{ color: colors.success }}>
                            Note: {report.admin_note}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Right: reporter + date + actions */}
                    <View className="items-end gap-2" style={{ minWidth: 160 }}>
                      <Text className="text-xs text-muted-foreground">
                        Reported by {report.reporter_name}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {fmtDate(report.created_at)}
                      </Text>
                      {tab === "pending" && (
                        <View className="flex-row gap-2 mt-1">
                          <Pressable
                            onPress={() => openDialog(report, "resolve")}
                            className="px-3 py-1.5 rounded-md"
                            style={{ backgroundColor: colors.successLight }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.success }}>
                              Resolve
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => openDialog(report, "dismiss")}
                            className="px-3 py-1.5 rounded-md border border-border"
                          >
                            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.dark }}>
                              Dismiss
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}

              {/* Load more */}
              {offset + LIMIT < total && (
                <View className="items-center py-4 border-t border-border">
                  <Button variant="outline" onPress={handleLoadMore}>
                    <Text>Load more</Text>
                  </Button>
                </View>
              )}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* ── Resolve / Dismiss Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <Text>{dialogAction === "resolve" ? "Resolve report" : "Dismiss report"}</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            <Text className="text-sm text-muted-foreground">
              {dialogAction === "resolve"
                ? "This will remove the reported content and mark the report as resolved."
                : "This will dismiss the report without taking action on the content."}
            </Text>
            <View className="gap-1.5">
              <Text className="text-sm font-medium text-foreground">Admin note (optional)</Text>
              <Textarea
                value={adminNote}
                onChangeText={setAdminNote}
                placeholder="Add an internal note..."
                numberOfLines={3}
              />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setDialogOpen(false)}>
              <Text>Cancel</Text>
            </Button>
            <Button
              onPress={handleConfirm}
              disabled={submitting}
              style={dialogAction === "resolve" ? { backgroundColor: colors.success } : undefined}
            >
              <Text style={dialogAction === "resolve" ? { color: colors.white } : undefined}>
                {submitting ? "Saving..." : dialogAction === "resolve" ? "Resolve" : "Dismiss"}
              </Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
