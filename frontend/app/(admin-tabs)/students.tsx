import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  Users,
  UserPlus,
  AlertTriangle,
  Flame,
  MessageSquare,
  Activity,
  Dumbbell,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  CalendarDays,
  Bell,
  LogOut,
} from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Header } from "@/src/components/Header";
import { MetricCard } from "@/src/components/MetricCard";
import { Student, AlertItem } from "@/src/types";

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  const [notifying, setNotifying] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  const handleNotifyAlerts = async () => {
    if (notifying) return;
    setNotifying(true);
    try {
      const res = await api.notifyAlerts();
      setNotifyMsg(res.message);
      setTimeout(() => setNotifyMsg(null), 4000);
    } catch {
      setNotifyMsg("Notificações disponíveis após publicar o app.");
      setTimeout(() => setNotifyMsg(null), 4000);
    } finally {
      setNotifying(false);
    }
  };

  const { role } = useAuth();

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboard(),
    enabled: role === "trainer",
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    queryFn: () => api.getStudents(),
    enabled: role === "trainer",
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["students-list"] })]);
    setRefreshing(false);
  };

  const openWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {});
  };

  const getStatusBadge = (status: Student["status"]) => {
    switch (status) {
      case "ativo":
        return { label: "Ativo", bg: "rgba(16, 185, 129, 0.15)", text: colors.success };
      case "proximo_vencimento":
        return { label: "Venc. Próximo", bg: "rgba(245, 158, 11, 0.15)", text: colors.warning };
      case "inadimplente":
        return { label: "Inadimplente", bg: "rgba(239, 68, 68, 0.15)", text: colors.error };
      case "inativo":
        return { label: "Inativo", bg: "rgba(107, 114, 128, 0.15)", text: colors.muted };
      default:
        return { label: status, bg: "rgba(107, 114, 128, 0.15)", text: colors.muted };
    }
  };

  return (
    <View testID="dashboard-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title="Treinaí"
        subtitle="Painel do Administrador"
        testID="dashboard-header"
        rightElement={
          <View style={styles.headerActions}>
            <Pressable
              testID="header-notify-button"
              onPress={handleNotifyAlerts}
              style={[styles.headerIconBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <Bell size={16} color={colors.brandPrimary} />
            </Pressable>
            <Pressable
              testID="header-logout-button"
              onPress={signOut}
              style={[styles.headerIconBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <LogOut size={16} color={colors.onSurfaceSecondary} />
            </Pressable>
          </View>
        }
      />

      {notifyMsg && (
        <View style={[styles.notifyBanner, { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary }]}>
          <Bell size={13} color={colors.brandPrimary} />
          <Text testID="notify-banner-text" style={[styles.notifyBannerText, { color: colors.brandPrimary }]} numberOfLines={1}>
            {notifyMsg}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={colors.brandPrimary}
          />
        }
      >
        {/* TOP SUMMARY CARDS (Meus Alunos - Resumo Operacional) */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Meus Alunos</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceSecondary }]}>
            {dashboard?.total_students || 0} alunos cadastrados
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Alunos Ativos"
            value={dashboard?.active_students || 0}
            deltaType="positive"
            delta="Em dia"
            icon={<Users size={18} color={colors.success} />}
            testID="card-active-students"
            onPress={() => router.push("/(tabs)/students")}
          />
          <MetricCard
            label="Novos no Mês"
            value={dashboard?.new_students_this_month || 0}
            deltaType="positive"
            delta="+2 este mês"
            icon={<UserPlus size={18} color={colors.info} />}
            testID="card-new-students"
            onPress={() => router.push("/students/new")}
          />
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard
            label="Avaliações Pendentes"
            value={dashboard?.pending_assessments || 0}
            deltaType="neutral"
            delta="Atrasadas"
            icon={<Activity size={18} color={colors.warning} />}
            testID="card-pending-assessments"
            onPress={() => router.push("/(tabs)/assessments")}
          />
          <MetricCard
            label="Pagamentos Atrasados"
            value={dashboard?.overdue_payments || 0}
            deltaType="negative"
            delta="Atrasados"
            icon={<AlertTriangle size={18} color={colors.error} />}
            testID="card-overdue-payments"
          />
        </View>

        {/* INACTIVE STUDENTS CALLOUT */}
        <Pressable
          testID="card-inactive-alert"
          onPress={() => router.push("/(tabs)/students")}
          style={[
            styles.inactiveBanner,
            {
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderColor: colors.error,
            },
          ]}
        >
          <View style={styles.inactiveLeft}>
            <Flame size={24} color={colors.error} />
            <View style={styles.inactiveTexts}>
              <Text style={[styles.inactiveTitle, { color: colors.onSurface }]}>
                {dashboard?.inactive_students_7d || 0} alunos sem treinar há 7+ dias
              </Text>
              <Text style={[styles.inactiveDesc, { color: colors.onSurfaceSecondary }]}>
                Envie uma mensagem de suporte para evitar evasão do plano.
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.error} />
        </Pressable>

        {/* QUICK ACTIONS BAR */}
        <View style={styles.quickActionsContainer}>
          <Pressable
            testID="quick-action-new-student"
            onPress={() => router.push("/students/new")}
            style={[styles.quickActionButton, { backgroundColor: colors.brandPrimary }]}
          >
            <UserPlus size={18} color={colors.onBrandPrimary} />
            <Text style={[styles.quickActionText, { color: colors.onBrandPrimary }]}>Cadastrar Aluno</Text>
          </Pressable>

          <Pressable
            testID="quick-action-new-assessment"
            onPress={() => router.push("/(tabs)/assessments")}
            style={[styles.quickActionButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Activity size={18} color={colors.brandPrimary} />
            <Text style={[styles.quickActionText, { color: colors.onSurface }]}>Nova Avaliação</Text>
          </Pressable>
        </View>

        {/* CRITICAL ALERTS STREAM */}
        {dashboard?.alerts && dashboard.alerts.length > 0 && (
          <View style={styles.alertsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.alertHeaderTitleRow}>
                <ShieldAlert size={18} color={colors.brandPrimary} />
                <Text style={[styles.sectionTitle, { color: colors.onSurface, marginLeft: 6 }]}>
                  Central de Alertas ({dashboard.alerts.length})
                </Text>
              </View>
            </View>

            {dashboard.alerts.map((alert: AlertItem) => (
              <View
                key={alert.id}
                testID={`alert-item-${alert.id}`}
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderLeftColor: alert.severity === "high" ? colors.error : colors.warning,
                    borderLeftWidth: 4,
                  },
                ]}
              >
                <View style={styles.alertTop}>
                  <Text style={[styles.alertTitle, { color: colors.onSurface }]}>
                    {alert.title}
                  </Text>
                  <Text
                    style={[
                      styles.alertBadge,
                      {
                        color: alert.severity === "high" ? colors.error : colors.warning,
                        backgroundColor:
                          alert.severity === "high"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                      },
                    ]}
                  >
                    {alert.severity === "high" ? "Urgente" : "Atenção"}
                  </Text>
                </View>

                <Text style={[styles.alertDescription, { color: colors.onSurfaceSecondary }]}>
                  {alert.description}
                </Text>

                <View style={styles.alertActions}>
                  <Pressable
                    testID={`alert-action-${alert.id}`}
                    onPress={() => {
                      if (alert.type === "inactivity") {
                        openWhatsApp(
                          alert.student_phone,
                          `Olá ${alert.student_name}! Notei que você não treina há alguns dias. Está tudo bem por aí? Podemos ajustar o horário ou os treinos? 💪`
                        );
                      } else if (alert.type === "payment_overdue") {
                        openWhatsApp(
                          alert.student_phone,
                          `Olá ${alert.student_name}! Passando para lembrar da sua mensalidade deste mês. Se precisar de link ou chave Pix, me avise!`
                        );
                      } else {
                        router.push(`/students/${alert.student_id}`);
                      }
                    }}
                    style={[
                      styles.alertActionButton,
                      { backgroundColor: alert.severity === "high" ? colors.brandPrimary : colors.surfaceTertiary },
                    ]}
                  >
                    <MessageSquare size={14} color={alert.severity === "high" ? "#FFF" : colors.onSurface} />
                    <Text
                      style={[
                        styles.alertActionText,
                        { color: alert.severity === "high" ? "#FFF" : colors.onSurface },
                      ]}
                    >
                      {alert.action_label}
                    </Text>
                  </Pressable>

                  <Pressable
                    testID={`alert-view-profile-${alert.id}`}
                    onPress={() => router.push(`/students/${alert.student_id}`)}
                    style={[styles.alertSecondaryButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.alertSecondaryText, { color: colors.onSurfaceSecondary }]}>
                      Ver Perfil
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ACTIVE ROSTER QUICK LIST */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Alunos em Destaque</Text>
          <Pressable
            testID="view-all-students"
            onPress={() => router.push("/(tabs)/students")}
          >
            <Text style={[styles.viewAllText, { color: colors.brandPrimary }]}>Ver todos ({students.length})</Text>
          </Pressable>
        </View>

        {students.slice(0, 5).map((student) => {
          const badge = getStatusBadge(student.status);
          return (
            <Pressable
              key={student.id}
              testID={`dashboard-student-card-${student.id}`}
              onPress={() => router.push(`/students/${student.id}`)}
              style={[
                styles.studentRow,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Image
                source={{ uri: student.photo_url || "https://images.unsplash.com/photo-1637651684506-07e16fcf7b06?w=200" }}
                style={styles.avatar}
                contentFit="cover"
              />

              <View style={styles.studentInfo}>
                <View style={styles.studentNameRow}>
                  <Text style={[styles.studentName, { color: colors.onSurface }]} numberOfLines={1}>
                    {student.name}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={[styles.studentMeta, { color: colors.onSurfaceSecondary }]}>
                  {student.goal} • {student.training_level} • {student.weight_kg} kg
                </Text>

                <View style={styles.studentFooter}>
                  <CalendarDays size={12} color={colors.muted} />
                  <Text style={[styles.lastWorkoutText, { color: colors.muted }]}>
                    Último treino: {student.last_workout_date || "Sem registro recente"}
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={colors.muted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  aiHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  aiHeaderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  notifyBannerText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  inactiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 14,
  },
  inactiveLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  inactiveTexts: {
    flex: 1,
  },
  inactiveTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  inactiveDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  quickActionsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  alertsSection: {
    marginBottom: 12,
  },
  alertHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  alertCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  alertTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  alertBadge: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  alertDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  alertActions: {
    flexDirection: "row",
    gap: 10,
  },
  alertActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: "700",
  },
  alertSecondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  alertSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  studentMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  studentFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lastWorkoutText: {
    fontSize: 11,
  },
}));
