import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import React, { useEffect, useMemo, useState } from "react";
import AppText from "@/src/components/ui/AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "@/src/constants/colors";
import {
  markReportSeen,
  markInquirySeen,
  getAdminMeta,
  getUserRole,
} from "@/src/lib/admin/adminApi";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { ReportDoc, InquiryDoc } from "@/src/types/admin";
import { db } from "@/src/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/src/providers/AuthProvider";

type TabKey = "reports" | "inquiries";

type ReportListItem = ReportDoc & {
  id: string;
};

type InquiryListItem = InquiryDoc & {
  id: string;
};

const ReportAndInquiryScreen = () => {
  const router = useRouter();
  const { user, initializing } = useAuth();

  const [loadingRole, setLoadingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [tab, setTab] = useState<TabKey>("reports");

  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([]);

  const [adminMeta, setAdminMeta] = useState<{
    reportsLastSeenAt?: any;
    inquiriesLastSeenAt?: any;
    reportSeenIds?: string[];
    inquirySeenIds?: string[];
  } | null>(null);

  const currentList = useMemo(() => {
    return tab === "reports" ? reports : inquiries;
  }, [tab, reports, inquiries]);

  const reportOpenCount = useMemo(
    () => reports.filter((item) => item.status === "open").length,
    [reports],
  );

  const inquiryOpenCount = useMemo(
    () => inquiries.filter((item) => item.status === "open").length,
    [inquiries],
  );

  const reportSeenIds = useMemo(
    () => new Set(adminMeta?.reportSeenIds ?? []),
    [adminMeta?.reportSeenIds],
  );

  const inquirySeenIds = useMemo(
    () => new Set(adminMeta?.inquirySeenIds ?? []),
    [adminMeta?.inquirySeenIds],
  );

  const newReportCount = useMemo(() => {
    return reports.filter((item) => !reportSeenIds.has(item.id)).length;
  }, [reports, reportSeenIds]);

  const newInquiryCount = useMemo(() => {
    return inquiries.filter((item) => !inquirySeenIds.has(item.id)).length;
  }, [inquiries, inquirySeenIds]);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      setLoadingRole(false);
      setIsAdmin(false);
      return;
    }

    const run = async () => {
      const role = await getUserRole(user.uid);
      setIsAdmin(role === "admin");

      if (role === "admin") {
        const meta = await getAdminMeta(user.uid);
        setAdminMeta(meta);
      }

      setLoadingRole(false);
    };

    run();
  }, [user, initializing]);

  useFocusEffect(
    React.useCallback(() => {
      if (!isAdmin || !user) return;

      const run = async () => {
        const meta = await getAdminMeta(user.uid);
        setAdminMeta(meta);
      };

      run();
    }, [isAdmin, user]),
  );

  useEffect(() => {
    if (!isAdmin) return;

    const reportsRef = collection(db, "reports");
    const reportsQ = query(reportsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(reportsQ, (snapshot) => {
      const next: ReportListItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as ReportDoc;
        return {
          id: docSnap.id,
          ...data,
        };
      });
      setReports(next);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    const inquiriesRef = collection(db, "inquiries");
    const inquiriesQ = query(inquiriesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(inquiriesQ, (snapshot) => {
      const next: InquiryListItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as InquiryDoc;
        return {
          id: docSnap.id,
          ...data,
        };
      });
      setInquiries(next);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  if (loadingRole) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppText preset="h3" style={styles.blockedTitle}>
            관리자 전용 페이지에요.
          </AppText>
          <AppText preset="h3" style={styles.blockedText}>
            현재 계정에는 접근 권한이 없어요.
          </AppText>

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <AppText preset="h2" style={styles.backButtonText}>
              돌아가기
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons
              name="chevron-back"
              size={22}
              color={COLORS.semantic.textPrimary}
            />
          </Pressable>

          <AppText preset="h1">제보/문의 관리</AppText>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.sectionCard}>
          <AppText preset="h2" style={styles.sectionTitle}>
            제보/문의
          </AppText>

          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabChip, tab === "reports" && styles.tabChipActive]}
              onPress={() => setTab("reports")}
            >
              <View style={styles.tabChipInner}>
                <AppText
                  preset="h3"
                  style={[
                    styles.tabChipText,
                    tab === "reports" && styles.tabChipTextActive,
                  ]}
                >
                  제보
                </AppText>

                {reportOpenCount > 0 ? (
                  <View style={styles.openBadge}>
                    <AppText preset="body" style={styles.openBadgeText}>
                      {reportOpenCount}
                    </AppText>
                  </View>
                ) : null}

                {newReportCount > 0 ? (
                  <View style={styles.newBadge}>
                    <AppText preset="body" style={styles.newBadgeText}>
                      NEW
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.tabChip,
                tab === "inquiries" && styles.tabChipActive,
              ]}
              onPress={() => setTab("inquiries")}
            >
              <View style={styles.tabChipInner}>
                <AppText
                  preset="h3"
                  style={[
                    styles.tabChipText,
                    tab === "inquiries" && styles.tabChipTextActive,
                  ]}
                >
                  문의
                </AppText>

                {inquiryOpenCount > 0 ? (
                  <View style={styles.openBadge}>
                    <AppText preset="body" style={styles.openBadgeText}>
                      {inquiryOpenCount}
                    </AppText>
                  </View>
                ) : null}

                {newInquiryCount > 0 ? (
                  <View style={styles.newBadge}>
                    <AppText preset="body" style={styles.newBadgeText}>
                      NEW
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <AppText preset="h2" style={styles.sectionTitle}>
            {tab === "reports" ? "제보 목록" : "문의 목록"}
          </AppText>

          {currentList.length > 0 ? (
            currentList.map((item, index) => {
            const status = item.status ?? "open";
            const statusLabel = getStatusLabel(status);
            const isNew =
              tab === "reports"
                ? !reportSeenIds.has(item.id)
                : !inquirySeenIds.has(item.id);

            return (
              <View key={item.id}>
                <Pressable
                  style={styles.itemRow}
                  onPress={async () => {
                    if (user) {
                      if (tab === "reports") {
                        setAdminMeta((prev) => ({
                          ...(prev ?? {}),
                          reportSeenIds: Array.from(
                            new Set([...(prev?.reportSeenIds ?? []), item.id]),
                          ),
                        }));
                        await markReportSeen(user.uid, item.id);
                      } else {
                        setAdminMeta((prev) => ({
                          ...(prev ?? {}),
                          inquirySeenIds: Array.from(
                            new Set([...(prev?.inquirySeenIds ?? []), item.id]),
                          ),
                        }));
                        await markInquirySeen(user.uid, item.id);
                      }
                    }

                    if (tab === "reports") {
                      router.push(`/admin/report/${item.id}`);
                    } else {
                      router.push(`/admin/inquiry/${item.id}`);
                    }
                  }}
                >
                  <View style={styles.itemMain}>
                    <View style={styles.itemTopRow}>
                      <AppText
                        preset="h3"
                        style={styles.itemTitle}
                        numberOfLines={1}
                      >
                        {"title" in item ? item.title : item.subject}
                      </AppText>

                      <View style={styles.itemBadgeRow}>
                        {isNew ? (
                          <View style={styles.newBadgeSmall}>
                            <AppText
                              preset="body"
                              style={styles.newBadgeSmallText}
                            >
                              NEW
                            </AppText>
                          </View>
                        ) : null}

                        <View style={[styles.statusBadge, statusStyle(status)]}>
                          <AppText preset="body" style={styles.statusBadgeText}>
                            {statusLabel}
                          </AppText>
                        </View>
                      </View>
                    </View>

                    {"brand" in item && item.brand ? (
                      <AppText preset="body" style={styles.itemMeta}>
                        {item.brand}
                        {item.drinkName ? ` • ${item.drinkName}` : ""}
                      </AppText>
                    ) : null}

                    <AppText
                      preset="caption"
                      style={styles.itemMessage}
                      numberOfLines={2}
                    >
                      {item.message}
                    </AppText>

                    <AppText preset="caption" style={styles.itemMeta}>
                      {item.createdByNickname || "익명"} •{" "}
                      {formatDate(item.createdAt)}
                    </AppText>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.semantic.textSecondary}
                  />
                </Pressable>

                {index < currentList.length - 1 ? (
                  <View style={styles.itemDivider} />
                ) : null}
              </View>
            );
            })
          ) : (
            <AppText preset="h3" style={styles.emptyText}>
              아직 들어온 {tab === "reports" ? "제보" : "문의"}가 없어요.
            </AppText>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportAndInquiryScreen;

function getStatusLabel(status: string) {
  switch (status) {
    case "open":
      return "접수됨";
    case "reviewing":
      return "검토 중";
    case "done":
      return "처리 완료";
    case "rejected":
      return "반려됨";
    default:
      return "접수됨";
  }
}

function statusStyle(status: string) {
  switch (status) {
    case "done":
      return { backgroundColor: "#EEF6FF" };
    case "reviewing":
      return { backgroundColor: "#FFF6E8" };
    case "rejected":
      return { backgroundColor: "#FFF1F3" };
    default:
      return { backgroundColor: COLORS.semantic.surface };
  }
}

function formatDate(value: any) {
  const date = value?.toDate?.() ?? null;
  if (!date) return "날짜 없음";

  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}.${m}.${d}`;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 28,
    gap: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  blockedTitle: {
    marginBottom: 8,
  },
  blockedText: {
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.base.warmBeige,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    color: COLORS.base.creamPaper,
  },
  headerRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.white,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
  },
  tabChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    backgroundColor: COLORS.base.warmBeige,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tabChipActive: {
    backgroundColor: COLORS.semantic.primary,
  },
  tabChipText: {
    color: COLORS.semantic.textSecondary,
  },
  tabChipTextActive: {
    color: COLORS.base.creamPaper,
  },
  itemRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemMain: {
    flex: 1,
    minWidth: 0,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 4,
  },
  itemTitle: {
    flex: 1,
  },
  itemMeta: {
    marginTop: 2,
  },
  itemMessage: {
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
  },
  statusBadgeText: {
    color: COLORS.semantic.textSecondary,
  },
  itemDivider: {
    height: 1,
    backgroundColor: COLORS.ui.border,
    marginVertical: 10,
  },
  emptyText: {
    color: COLORS.semantic.textSecondary,
  },
  tabChipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    backgroundColor: COLORS.semantic.surface,
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
    justifyContent: "center",
  },
  openBadgeText: {
    fontSize: 10,
    lineHeight: 11,
    color: COLORS.semantic.textSecondary,
  },
  newBadge: {
    paddingHorizontal: 7,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#FFF1F3",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
    justifyContent: "center",
  },
  newBadgeText: {
    fontSize: 10,
    lineHeight: 11,
    color: "#B24A4A",
  },
  itemBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newBadgeSmall: {
    paddingHorizontal: 7,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#FFF1F3",
    borderWidth: 1,
    borderColor: COLORS.ui.border,
    alignItems: "center",
    justifyContent: "center",
  },
  newBadgeSmallText: {
    fontSize: 10,
    lineHeight: 11,
    color: "#B24A4A",
  },
});
