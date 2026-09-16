import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  MessageSquare,
  Activity,
  Dumbbell,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileText,
  Clock,
  History,
  Scale,
  CheckCircle2,
  Phone,
  Edit3,
  Plus,
  Trash,
} from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";
import { MetricCard } from "@/src/components/MetricCard";
import { FilterChipRow, ChipOption } from "@/src/components/FilterChipRow";
import { EvolutionChart } from "@/src/components/EvolutionChart";
import { PhotoComparator } from "@/src/components/PhotoComparator";
import { CalendarGrid } from "@/src/components/CalendarGrid";
import { Student, PhysicalAssessment, WorkoutPlan, Anamnesis, StudentHistoryEvent } from "@/src/types";

const PROFILE_TABS: ChipOption[] = [
  { id: "overview", label: "Visão Geral" },
  { id: "evolution", label: "Minha Evolução" },
  { id: "before-after", label: "Antes e Depois" },
  { id: "assessments", label: "Avaliações" },
  { id: "workouts", label: "Treino Atual" },
  { id: "diet", label: "Dieta" },
  { id: "anamnesis", label: "Anamnese" },
  { id: "attendance", label: "Frequência" },
  { id: "history", label: "Histórico" },
  { id: "chat", label: "Chat Aluno" },
];

export default function StudentDetailScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCircRegion, setSelectedCircRegion] = useState("cintura");
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  // Queries
  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ["student-detail", id],
    queryFn: () => api.getStudent(id as string),
    enabled: !!id,
  });

  const { data: evolution } = useQuery({
    queryKey: ["student-evolution", id],
    queryFn: () => api.getStudentEvolution(id as string),
    enabled: !!id,
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ["student-assessments", id],
    queryFn: () => api.getAssessments(id as string),
    enabled: !!id,
  });

  const { data: workouts = [] } = useQuery({
    queryKey: ["student-workouts", id],
    queryFn: () => api.getWorkouts(id as string),
    enabled: !!id,
  });

  const { data: anamnesis } = useQuery({
    queryKey: ["student-anamnesis", id],
    queryFn: () => api.getAnamnesis(id as string),
    enabled: !!id,
  });

  const { data: attendanceData } = useQuery({
    queryKey: ["student-attendance", id],
    queryFn: () => api.getAttendance(id as string),
    enabled: !!id,
  });

  const { data: historyEvents = [] } = useQuery({
    queryKey: ["student-history", id],
    queryFn: () => api.getStudentHistory(id as string),
    enabled: !!id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["student-messages", id],
    queryFn: () => api.getMessages(id as string),
    enabled: !!id,
  });

  const activeWorkout = workouts.find((w) => w.is_active) || workouts[0];

  const handleQuickLogAttendance = async (date: string, status: "presente" | "falta") => {
    try {
      await api.logAttendance(id as string, { date, status });
      queryClient.invalidateQueries({ queryKey: ["student-attendance", id] });
      queryClient.invalidateQueries({ queryKey: ["student-history", id] });
      queryClient.invalidateQueries({ queryKey: ["student-detail", id] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || sendingMsg) return;
    setSendingMsg(true);
    try {
      await api.sendMessage(id as string, chatInput.trim(), "personal");
      setChatInput("");
      queryClient.invalidateQueries({ queryKey: ["student-messages", id] });
    } catch (e) {
      console.error(e);
    } finally {
      setSendingMsg(false);
    }
  };

  const openWhatsApp = () => {
    if (!student?.phone) return;
    const cleanPhone = student.phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(`Olá ${student.name}, tudo bem?`)}`;
    Linking.openURL(url).catch(() => {});
  };

  if (loadingStudent || !student) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
        <Text style={[styles.loadingText, { color: colors.onSurfaceSecondary }]}>
          Carregando perfil do aluno...
        </Text>
      </View>
    );
  }

  const latestAssessment = assessments[0];
  const bmi = student.height_cm > 0 ? (student.weight_kg / Math.pow(student.height_cm / 100, 2)).toFixed(1) : "-";

  return (
    <View testID="student-detail-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title={student.name}
        subtitle={`${student.goal} • ${student.training_level}`}
        showBack
        testID="student-detail-header"
        rightElement={
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => {
                const executeDelete = async () => {
                  try {
                    await api.deleteStudent(student.id);
                    queryClient.invalidateQueries({ queryKey: ["students-list"] });
                    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
                    router.replace("/(tabs)");
                  } catch(e) { console.error(e); }
                };

                if (Platform.OS === "web") {
                  if (window.confirm("Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.")) {
                    executeDelete();
                  }
                } else {
                  Alert.alert(
                    "Excluir Aluno",
                    "Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.",
                    [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Excluir", style: "destructive", onPress: executeDelete }
                    ]
                  );
                }
              }}
              style={[styles.headerIconBtn, { backgroundColor: "rgba(239, 68, 68, 0.15)", borderColor: colors.error }]}
            >
              <Trash size={20} color={colors.error} />
            </Pressable>
            <Pressable
              testID="header-whatsapp-btn"
              onPress={openWhatsApp}
              style={[styles.headerIconBtn, { backgroundColor: "rgba(16, 185, 129, 0.15)", borderColor: colors.success }]}
            >
              <Phone size={20} color={colors.success} />
            </Pressable>
          </View>
        }
      />

      {/* STUDENT HERO CARD */}
      <View style={[styles.heroCard, { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.border }]}>
        <Image
          source={{ uri: student.photo_url || "https://images.unsplash.com/photo-1637651684506-07e16fcf7b06?w=200" }}
          style={styles.heroAvatar}
          contentFit="cover"
        />
        <View style={styles.heroInfo}>
          <View style={styles.heroNameRow}>
            <Text style={[styles.heroName, { color: colors.onSurface }]} numberOfLines={1}>
              {student.name}
            </Text>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor:
                    student.status === "ativo"
                      ? "rgba(16, 185, 129, 0.15)"
                      : student.status === "inadimplente"
                      ? "rgba(239, 68, 68, 0.15)"
                      : "rgba(245, 158, 11, 0.15)",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  {
                    color:
                      student.status === "ativo"
                        ? colors.success
                        : student.status === "inadimplente"
                        ? colors.error
                        : colors.warning,
                  },
                ]}
              >
                {student.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={[styles.heroDetails, { color: colors.onSurfaceSecondary }]}>
            {student.gender} • {student.age || 26} anos • Plano {student.plan} • Venc. {student.due_date}
          </Text>

          <Text style={[styles.heroNotes, { color: colors.brandPrimary }]} numberOfLines={1}>
            {student.notes || "Sem observações adicionais"}
          </Text>
        </View>
      </View>

      {/* P0 FILTER CHIP ROW (Tabs for Profile Navigation) */}
      <FilterChipRow
        options={PROFILE_TABS}
        selectedId={activeTab}
        onSelect={setActiveTab}
        testIDPrefix="profile-tab"
      />

      {/* SCROLLABLE TAB CONTENT */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 60 },
        ]}
      >
        {/* ==================================================== */}
        {/* TAB 8: DIETA */}
        {/* ==================================================== */}
        {activeTab === "diet" && (
          <View testID="tab-content-diet">
            <View style={[styles.sectionCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Flame size={20} color={colors.brandPrimary} />
                  <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Plano Alimentar do Aluno</Text>
                </View>
                <Pressable
                  onPress={() => {
                    const mealName = Platform.OS === "web" ? window.prompt("Nome da Refeição (ex: Café da Manhã):") : "Nova Refeição";
                    if (!mealName) return;
                    const caloriesStr = Platform.OS === "web" ? window.prompt("Calorias estimadas:") : "300";
                    const calories = parseInt(caloriesStr || "0");
                    const desc = Platform.OS === "web" ? window.prompt("Descrição (o que comer):") : "1 pão, 2 ovos";
                    const newMeal = { id: Math.random().toString(), time: "08:00", name: mealName, calories, description: desc || "" };
                    const currentDiet = student.diet_plan || [];
                    api.updateStudent(student.id, { diet_plan: [...currentDiet, newMeal] }).then(() => queryClient.invalidateQueries({ queryKey: ["student-detail", student.id] }));
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Plus size={16} color={colors.brandPrimary} />
                  <Text style={{ color: colors.brandPrimary, fontWeight: "bold" }}>Adicionar Refeição</Text>
                </Pressable>
              </View>

              {(!student.diet_plan || student.diet_plan.length === 0) ? (
                <View style={[styles.emptyState, { backgroundColor: colors.surfaceTertiary, padding: 16, borderRadius: 12, alignItems: "center" }]}>
                  <Text style={{ color: colors.muted }}>Nenhuma refeição cadastrada no plano.</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {student.diet_plan.map(meal => (
                    <View key={meal.id} style={{ padding: 12, borderRadius: 12, backgroundColor: colors.surfaceTertiary, borderColor: colors.border, borderWidth: 1 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.onSurface }}>{meal.name}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.brandPrimary }}>{meal.calories} kcal</Text>
                          <Pressable onPress={() => {
                            if(window.confirm("Remover esta refeição do plano?")) {
                              const newPlan = student.diet_plan!.filter(m => m.id !== meal.id);
                              api.updateStudent(student.id, { diet_plan: newPlan }).then(() => queryClient.invalidateQueries({ queryKey: ["student-detail", student.id] }));
                            }
                          }}>
                            <Trash size={16} color={colors.error} />
                          </Pressable>
                        </View>
                      </View>
                      <Text style={{ color: colors.muted, marginTop: 4 }}>{meal.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 1: VISÃO GERAL */}
        {/* ==================================================== */}
        {activeTab === "overview" && (
          <View testID="tab-content-overview">
            {/* VITAL METRICS GRID */}
            <View style={styles.metricsGrid}>
              <MetricCard
                label="Peso Atual"
                value={student.weight_kg}
                unit="kg"
                deltaType={evolution?.indicators[0]?.is_positive_evolution ? "positive" : "neutral"}
                delta={evolution?.indicators[0]?.delta_total ? `${evolution.indicators[0].delta_total} kg` : "Baseline"}
                icon={<Scale size={18} color={colors.brandPrimary} />}
                testID="overview-metric-weight"
              />
              <MetricCard
                label="Gordura Corporal"
                value={latestAssessment ? `${latestAssessment.body_fat_pct}%` : "--"}
                deltaType="positive"
                delta={latestAssessment ? `${latestAssessment.fat_mass_kg} kg gorda` : "Avaliar"}
                icon={<Activity size={18} color={colors.warning} />}
                testID="overview-metric-fat"
              />
            </View>

            <View style={styles.metricsGrid}>
              <MetricCard
                label="Massa Magra"
                value={latestAssessment ? `${latestAssessment.lean_mass_kg} kg` : "--"}
                deltaType="positive"
                delta="Músculo puro"
                icon={<TrendingUp size={18} color={colors.success} />}
                testID="overview-metric-muscle"
              />
              <MetricCard
                label="Frequência"
                value={`${attendanceData?.summary.monthly_frequency || 100}%`}
                deltaType="positive"
                delta={`${attendanceData?.summary.total_performed || 0} treinos`}
                icon={<Calendar size={18} color={colors.info} />}
                testID="overview-metric-freq"
              />
            </View>

            {/* QUICK ACTIONS ROW */}
            <View style={styles.profileActionRow}>
              <Pressable
                testID="btn-profile-new-eval"
                onPress={() => router.push(`/students/${student.id}/assessment/new`)}
                style={[styles.profileActionBtn, { backgroundColor: colors.brandPrimary }]}
              >
                <Activity size={16} color="#FFF" />
                <Text style={styles.profileActionBtnText}>Nova Avaliação</Text>
              </Pressable>

              <Pressable
                testID="btn-profile-new-workout"
                onPress={() => router.push(`/students/${student.id}/workout/new`)}
                style={[styles.profileActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1 }]}
              >
                <Dumbbell size={16} color={colors.brandPrimary} />
                <Text style={[styles.profileActionBtnText, { color: colors.onSurface }]}>Novo Treino</Text>
              </Pressable>

              <Pressable
                testID="btn-profile-chat"
                onPress={() => setActiveTab("chat")}
                style={[styles.profileActionBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1 }]}
              >
                <MessageSquare size={16} color={colors.info} />
                <Text style={[styles.profileActionBtnText, { color: colors.onSurface }]}>Mensagem</Text>
              </Pressable>
            </View>

            {/* CURRENT ACTIVE WORKOUT SUMMARY */}
            <View style={[styles.sectionBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.sectionBoxHeader}>
                <View style={styles.titleWithIcon}>
                  <Dumbbell size={18} color={colors.brandPrimary} />
                  <Text style={[styles.sectionBoxTitle, { color: colors.onSurface }]}>
                    Treino Atual em Andamento
                  </Text>
                </View>
                <Pressable onPress={() => setActiveTab("workouts")}>
                  <Text style={[styles.seeMoreLink, { color: colors.brandPrimary }]}>Ver Tudo</Text>
                </Pressable>
              </View>

              {activeWorkout ? (
                <View>
                  <Text style={[styles.activeWorkoutTitle, { color: colors.onSurface }]}>
                    {activeWorkout.title} ({activeWorkout.frequency_weekly}x/sem)
                  </Text>
                  <Text style={[styles.activeWorkoutGoal, { color: colors.onSurfaceSecondary }]}>
                    Objetivo: {activeWorkout.goal}
                  </Text>
                  <View style={styles.divisionsRow}>
                    {activeWorkout.days.map((d, idx) => (
                      <View key={idx} style={[styles.divisionBadge, { backgroundColor: colors.surfaceTertiary }]}>
                        <Text style={[styles.divisionBadgeText, { color: colors.onSurface }]}>
                          {d.day_label.split("-")[0]} ({d.exercises.length} ex)
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.onSurfaceSecondary }]}>
                  Nenhum treino ativo no momento.
                </Text>
              )}
            </View>

            {/* LAST ASSESSMENT CALLOUT */}
            <View style={[styles.sectionBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.sectionBoxHeader}>
                <View style={styles.titleWithIcon}>
                  <Activity size={18} color={colors.brandPrimary} />
                  <Text style={[styles.sectionBoxTitle, { color: colors.onSurface }]}>
                    Última Avaliação Física
                  </Text>
                </View>
                <Pressable onPress={() => setActiveTab("evolution")}>
                  <Text style={[styles.seeMoreLink, { color: colors.brandPrimary }]}>Evolução</Text>
                </Pressable>
              </View>

              {latestAssessment ? (
                <View>
                  <Text style={[styles.evalDate, { color: colors.brandPrimary }]}>
                    Data: {latestAssessment.date} ({latestAssessment.protocol.toUpperCase()})
                  </Text>
                  <Text style={[styles.evalSummaryText, { color: colors.onSurface }]}>
                    Peso: {latestAssessment.weight_kg}kg • Gordura: {latestAssessment.body_fat_pct}% • Massa Magra: {latestAssessment.lean_mass_kg}kg
                  </Text>
                  {latestAssessment.notes ? (
                    <Text style={[styles.evalNotesText, { color: colors.onSurfaceSecondary }]}>
                      "{latestAssessment.notes}"
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.onSurfaceSecondary }]}>
                  Nenhuma avaliação registrada ainda.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MINHA EVOLUÇÃO (COMPARATIVO E GRÁFICOS) */}
        {/* ==================================================== */}
        {activeTab === "evolution" && (
          <View testID="tab-content-evolution">
            {/* COMPARISON TABLE: ATUAL VS ANTERIOR VS BASELINE */}
            <View style={[styles.comparisonCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableColHeader, { flex: 2, color: colors.onSurface }]}>Indicador</Text>
                <Text style={[styles.tableColHeader, { flex: 1.2, color: colors.muted, textAlign: "center" }]}>Início</Text>
                <Text style={[styles.tableColHeader, { flex: 1.2, color: colors.muted, textAlign: "center" }]}>Anterior</Text>
                <Text style={[styles.tableColHeader, { flex: 1.2, color: colors.brandPrimary, textAlign: "center" }]}>Atual</Text>
                <Text style={[styles.tableColHeader, { flex: 1.4, color: colors.onSurface, textAlign: "right" }]}>Evolução</Text>
              </View>

              {evolution?.indicators && evolution.indicators.map((ind, idx) => {
                const isPos = ind.is_positive_evolution;
                const sign = ind.delta_total > 0 ? "+" : "";
                return (
                  <View key={idx} style={[styles.tableRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.tableCellName, { flex: 2, color: colors.onSurface }]}>
                      {ind.name}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.2, color: colors.onSurfaceSecondary, textAlign: "center" }]}>
                      {ind.baseline_value} {ind.unit}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.2, color: colors.onSurfaceSecondary, textAlign: "center" }]}>
                      {ind.previous_value} {ind.unit}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.2, color: colors.onSurface, fontWeight: "700", textAlign: "center" }]}>
                      {ind.current_value} {ind.unit}
                    </Text>
                    <View style={[styles.deltaBadgeWrap, { flex: 1.4, alignItems: "flex-end" }]}>
                      <View
                        style={[
                          styles.tableDeltaBadge,
                          {
                            backgroundColor: isPos ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          },
                        ]}
                      >
                        <Text style={[styles.tableDeltaText, { color: isPos ? colors.success : colors.error }]}>
                          {sign}{ind.delta_total} {ind.unit}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* CHART 1: BODY COMPOSITION TELEMETRY (PESO, MASSA MAGRA, MASSA GORDA) */}
            {evolution && evolution.weight_series.length > 0 && (
              <EvolutionChart
                title="Composição Corporal Simultânea"
                subtitle="Peso total, massa magra muscular e massa de gordura"
                testID="chart-body-composition"
                dataSeries={[
                  {
                    name: "Peso Total",
                    color: colors.brandPrimary,
                    data: evolution.weight_series,
                    unit: "kg",
                  },
                  {
                    name: "Massa Magra",
                    color: colors.success,
                    data: evolution.lean_mass_series,
                    unit: "kg",
                  },
                  {
                    name: "Massa Gorda",
                    color: colors.warning,
                    data: evolution.fat_mass_series,
                    unit: "kg",
                  },
                ]}
              />
            )}

            {/* CHART 2: PERCENTUAL DE GORDURA */}
            {evolution && evolution.body_fat_series.length > 0 && (
              <EvolutionChart
                title="Percentual de Gordura (% Gordura)"
                subtitle="Evolução calculada rigorosamente pelos protocolos Pollock"
                testID="chart-body-fat"
                dataSeries={[
                  {
                    name: "% Gordura",
                    color: colors.error,
                    data: evolution.body_fat_series,
                    unit: "%",
                  },
                ]}
              />
            )}

            {/* CIRCUMFERENCES REGION SELECTOR AND CHART */}
            {evolution && evolution.circumferences_series && Object.keys(evolution.circumferences_series).length > 0 && (
              <View>
                <View style={styles.regionSelectorRow}>
                  <Text style={[styles.regionLabel, { color: colors.onSurface }]}>Região Corporal:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionScroll}>
                    {Object.keys(evolution.circumferences_series).map((reg) => (
                      <Pressable
                        key={reg}
                        testID={`circ-reg-${reg}`}
                        onPress={() => setSelectedCircRegion(reg)}
                        style={[
                          styles.regionChip,
                          {
                            backgroundColor: selectedCircRegion === reg ? colors.brandPrimary : colors.surfaceTertiary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.regionChipText,
                            { color: selectedCircRegion === reg ? "#FFF" : colors.onSurfaceSecondary },
                          ]}
                        >
                          {reg.toUpperCase()}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>

                {evolution.circumferences_series[selectedCircRegion] && (
                  <EvolutionChart
                    title={`Evolução de ${selectedCircRegion.toUpperCase()}`}
                    subtitle="Circunferência medida em centímetros"
                    testID={`chart-circ-${selectedCircRegion}`}
                    dataSeries={[
                      {
                        name: selectedCircRegion.toUpperCase(),
                        color: colors.info,
                        data: evolution.circumferences_series[selectedCircRegion],
                        unit: "cm",
                      },
                    ]}
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 3: ANTES E DEPOIS (FOTOS DE EVOLUÇÃO) */}
        {/* ==================================================== */}
        {activeTab === "before-after" && (
          <View testID="tab-content-before-after">
            <PhotoComparator
              assessments={assessments}
              testID="student-photo-comparator"
            />
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 4: AVALIAÇÕES FÍSICAS COMPLETAS */}
        {/* ==================================================== */}
        {activeTab === "assessments" && (
          <View testID="tab-content-assessments">
            <Pressable
              testID="btn-tab-new-assessment"
              onPress={() => router.push(`/students/${student.id}/assessment/new`)}
              style={[styles.primaryActionBtn, { backgroundColor: colors.brandPrimary }]}
            >
              <Plus size={18} color="#FFF" />
              <Text style={styles.primaryActionBtnText}>Registrar Nova Avaliação</Text>
            </Pressable>

            {assessments.map((evalItem) => (
              <View
                key={evalItem.id}
                testID={`eval-card-${evalItem.id}`}
                style={[styles.evalDetailCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              >
                <View style={styles.evalDetailHeader}>
                  <View>
                    <Text style={[styles.evalDetailDate, { color: colors.onSurface }]}>
                      Avaliação de {evalItem.date}
                    </Text>
                    <Text style={[styles.evalDetailProtocol, { color: colors.brandPrimary }]}>
                      Protocolo: {evalItem.protocol.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.evalDetailFat}>
                    <Text style={[styles.evalDetailFatNum, { color: colors.brandPrimary }]}>
                      {evalItem.body_fat_pct}%
                    </Text>
                    <Text style={[styles.evalDetailFatLbl, { color: colors.muted }]}>Gordura</Text>
                  </View>
                </View>

                {/* METRICS */}
                <View style={[styles.evalDetailMetricsRow, { backgroundColor: colors.surfaceTertiary }]}>
                  <View style={styles.evalDetailMetricCol}>
                    <Text style={[styles.evalDetailMetricLbl, { color: colors.muted }]}>Peso</Text>
                    <Text style={[styles.evalDetailMetricVal, { color: colors.onSurface }]}>
                      {evalItem.weight_kg} kg
                    </Text>
                  </View>
                  <View style={styles.evalDetailMetricCol}>
                    <Text style={[styles.evalDetailMetricLbl, { color: colors.muted }]}>Massa Magra</Text>
                    <Text style={[styles.evalDetailMetricVal, { color: colors.success }]}>
                      {evalItem.lean_mass_kg} kg
                    </Text>
                  </View>
                  <View style={styles.evalDetailMetricCol}>
                    <Text style={[styles.evalDetailMetricLbl, { color: colors.muted }]}>Massa Gorda</Text>
                    <Text style={[styles.evalDetailMetricVal, { color: colors.warning }]}>
                      {evalItem.fat_mass_kg} kg
                    </Text>
                  </View>
                </View>

                {/* CIRCUMFERENCES PREVIEW */}
                {evalItem.circumferences && (
                  <View style={styles.circPreviewGrid}>
                    {evalItem.circumferences.cintura ? (
                      <Text style={[styles.circItemText, { color: colors.onSurfaceSecondary }]}>
                        Cintura: <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{evalItem.circumferences.cintura} cm</Text>
                      </Text>
                    ) : null}
                    {evalItem.circumferences.abdomen ? (
                      <Text style={[styles.circItemText, { color: colors.onSurfaceSecondary }]}>
                        Abdômen: <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{evalItem.circumferences.abdomen} cm</Text>
                      </Text>
                    ) : null}
                    {evalItem.circumferences.braco_dir ? (
                      <Text style={[styles.circItemText, { color: colors.onSurfaceSecondary }]}>
                        Braço Dir: <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{evalItem.circumferences.braco_dir} cm</Text>
                      </Text>
                    ) : null}
                    {evalItem.circumferences.coxa_dir ? (
                      <Text style={[styles.circItemText, { color: colors.onSurfaceSecondary }]}>
                        Coxa Dir: <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{evalItem.circumferences.coxa_dir} cm</Text>
                      </Text>
                    ) : null}
                  </View>
                )}

                {evalItem.notes ? (
                  <Text style={[styles.evalNotesFull, { color: colors.onSurfaceSecondary }]}>
                    Observações: {evalItem.notes}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 5: TREINO ATUAL & EXERCÍCIOS */}
        {/* ==================================================== */}
        {activeTab === "workouts" && (
          <View testID="tab-content-workouts">
            <Pressable
              testID="btn-tab-new-workout"
              onPress={() => router.push(`/students/${student.id}/workout/new`)}
              style={[styles.primaryActionBtn, { backgroundColor: colors.brandPrimary }]}
            >
              <Plus size={18} color="#FFF" />
              <Text style={styles.primaryActionBtnText}>Criar / Prescrever Novo Treino</Text>
            </Pressable>

            {workouts.map((plan) => (
              <View key={plan.id} style={[styles.workoutFullCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <View style={styles.workoutFullHeader}>
                  <View>
                    <Text style={[styles.workoutFullTitle, { color: colors.onSurface }]}>
                      {plan.title}
                    </Text>
                    <Text style={[styles.workoutFullGoal, { color: colors.brandPrimary }]}>
                      {plan.goal} • {plan.frequency_weekly}x por semana
                    </Text>
                  </View>
                  <View style={[styles.activeStatusPill, { backgroundColor: plan.is_active ? "rgba(16, 185, 129, 0.15)" : colors.surfaceTertiary }]}>
                    <Text style={[styles.activeStatusPillText, { color: plan.is_active ? colors.success : colors.muted }]}>
                      {plan.is_active ? "Ativo" : "Anterior"}
                    </Text>
                  </View>
                </View>

                {plan.notes ? (
                  <Text style={[styles.workoutPlanNotes, { color: colors.onSurfaceSecondary }]}>
                    💡 {plan.notes}
                  </Text>
                ) : null}

                {/* DAYS AND EXERCISES */}
                {plan.days.map((day, dIdx) => (
                  <View key={day.id || dIdx} style={[styles.dayContainer, { borderColor: colors.border }]}>
                    <View style={[styles.dayHeader, { backgroundColor: colors.surfaceTertiary }]}>
                      <Text style={[styles.dayLabel, { color: colors.onSurface }]}>{day.day_label}</Text>
                      <Text style={[styles.dayTargetMuscles, { color: colors.brandPrimary }]}>
                        {day.target_muscles}
                      </Text>
                    </View>

                    {day.exercises.map((ex, eIdx) => (
                      <View key={ex.id || eIdx} style={[styles.exerciseRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.exerciseLeft}>
                          <Text style={[styles.exerciseIndex, { color: colors.muted }]}>{eIdx + 1}.</Text>
                          <View>
                            <Text style={[styles.exerciseName, { color: colors.onSurface }]}>{ex.name}</Text>
                            {ex.notes ? (
                              <Text style={[styles.exerciseNote, { color: colors.onSurfaceSecondary }]}>
                                {ex.notes}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.exerciseTelemetry}>
                          <Text style={[styles.exerciseSeriesReps, { color: colors.onSurface }]}>
                            {ex.sets}x {ex.reps}
                          </Text>
                          <Text style={[styles.exerciseLoad, { color: colors.brandPrimary }]}>
                            {ex.load_kg || 0} kg • {ex.rest_seconds}s
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 6: ANAMNESE */}
        {/* ==================================================== */}
        {activeTab === "anamnesis" && (
          <View testID="tab-content-anamnesis">
            <Pressable
              testID="btn-tab-edit-anamnesis"
              onPress={() => router.push(`/students/${student.id}/anamnesis`)}
              style={[styles.primaryActionBtn, { backgroundColor: colors.brandPrimary }]}
            >
              <Edit3 size={18} color="#FFF" />
              <Text style={styles.primaryActionBtnText}>Editar Ficha de Anamnese</Text>
            </Pressable>

            {anamnesis?.ai_analysis && (
              <View style={[styles.aiAnalysisCard, { backgroundColor: "rgba(255, 87, 34, 0.1)", borderColor: colors.brandPrimary }]}>
                <View style={styles.aiAnalysisHeader}>
                  <Sparkles size={18} color={colors.brandPrimary} />
                  <Text style={[styles.aiAnalysisTitle, { color: colors.brandPrimary }]}>
                    Análise Fisiológica por IA
                  </Text>
                </View>
                <Text style={[styles.aiAnalysisText, { color: colors.onSurface }]}>
                  {anamnesis.ai_analysis}
                </Text>
              </View>
            )}

            <View style={[styles.anamnesisCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={styles.anamnesisItem}>
                <Text style={[styles.anamnesisItemTitle, { color: colors.brandPrimary }]}>Objetivo Principal</Text>
                <Text style={[styles.anamnesisItemValue, { color: colors.onSurface }]}>
                  {anamnesis?.goal || student.goal}
                </Text>
              </View>

              <View style={styles.anamnesisItem}>
                <Text style={[styles.anamnesisItemTitle, { color: colors.brandPrimary }]}>Histórico de Treinamento</Text>
                <Text style={[styles.anamnesisItemValue, { color: colors.onSurface }]}>
                  {anamnesis?.training_history || "Não informado"}
                </Text>
              </View>

              <View style={styles.anamnesisItem}>
                <Text style={[styles.anamnesisItemTitle, { color: colors.brandPrimary }]}>Lesões e Desconfortos</Text>
                <Text style={[styles.anamnesisItemValue, { color: colors.onSurface }]}>
                  {anamnesis?.injuries || "Nenhuma relatada"}
                </Text>
              </View>

              <View style={styles.anamnesisItem}>
                <Text style={[styles.anamnesisItemTitle, { color: colors.brandPrimary }]}>Medicamentos em Uso</Text>
                <Text style={[styles.anamnesisItemValue, { color: colors.onSurface }]}>
                  {anamnesis?.medications || "Nenhum"}
                </Text>
              </View>

              <View style={styles.anamnesisItem}>
                <Text style={[styles.anamnesisItemTitle, { color: colors.brandPrimary }]}>Hábitos & Sono</Text>
                <Text style={[styles.anamnesisItemValue, { color: colors.onSurface }]}>
                  {anamnesis?.habits || "Não informado"}
                </Text>
              </View>

              <View style={styles.anamnesisItem}>
                <Text style={[styles.anamnesisItemTitle, { color: colors.brandPrimary }]}>Restrições e Recomendações</Text>
                <Text style={[styles.anamnesisItemValue, { color: colors.onSurface }]}>
                  {anamnesis?.restrictions || "Nenhuma restrição articular ou cardiovascular."}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 7: FREQUÊNCIA & CALENDÁRIO */}
        {/* ==================================================== */}
        {activeTab === "attendance" && (
          <View testID="tab-content-attendance">
            {attendanceData && (
              <CalendarGrid
                summary={attendanceData.summary}
                onQuickLog={handleQuickLogAttendance}
                testID="student-calendar-grid"
              />
            )}
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 8: HISTÓRICO CRONOLÓGICO */}
        {/* ==================================================== */}
        {activeTab === "history" && (
          <View testID="tab-content-history">
            <View style={styles.historyTimeline}>
              {historyEvents.map((event: StudentHistoryEvent, idx) => (
                <View key={event.id || idx} style={styles.timelineItem}>
                  <View style={styles.timelineIconCol}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.brandPrimary }]} />
                    {idx < historyEvents.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                    )}
                  </View>

                  <View style={[styles.timelineContent, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    <View style={styles.timelineTop}>
                      <Text style={[styles.timelineDate, { color: colors.brandPrimary }]}>
                        {event.date}
                      </Text>
                      {event.delta ? (
                        <View style={[styles.timelineDeltaBadge, { backgroundColor: colors.brandTertiary }]}>
                          <Text style={[styles.timelineDeltaText, { color: colors.brandPrimary }]}>
                            {event.delta}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={[styles.timelineTitle, { color: colors.onSurface }]}>
                      {event.title}
                    </Text>
                    <Text style={[styles.timelineDesc, { color: colors.onSurfaceSecondary }]}>
                      {event.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ==================================================== */}
        {/* TAB 9: CHAT COM O ALUNO */}
        {/* ==================================================== */}
        {activeTab === "chat" && (
          <View testID="tab-content-chat">
            {/* MESSAGES LIST */}
            <View style={styles.messagesContainer}>
              {messages.map((msg) => {
                const isPersonal = msg.sender === "personal";
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubbleWrap,
                      isPersonal ? styles.chatBubbleRight : styles.chatBubbleLeft,
                    ]}
                  >
                    <Text style={[styles.chatSenderLabel, { color: colors.muted }]}>
                      {isPersonal ? "Você (Personal)" : student.name}
                    </Text>
                    <View
                      style={[
                        styles.chatBubble,
                        {
                          backgroundColor: isPersonal ? colors.brandPrimary : colors.surfaceSecondary,
                          borderColor: isPersonal ? colors.brandPrimary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatBubbleText,
                          { color: isPersonal ? "#FFFFFF" : colors.onSurface },
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* CHAT INPUT */}
            <View style={[styles.chatInputRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <TextInput
                testID="chat-text-input"
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ex: Como você se sentiu no treino de hoje?..."
                placeholderTextColor={colors.muted}
                style={[styles.chatTextInput, { color: colors.onSurface }]}
              />
              <Pressable
                testID="btn-send-message"
                onPress={handleSendMessage}
                disabled={sendingMsg || !chatInput.trim()}
                style={[
                  styles.chatSendBtn,
                  { backgroundColor: chatInput.trim() ? colors.brandPrimary : colors.surfaceTertiary },
                ]}
              >
                <Text style={{ color: chatInput.trim() ? "#FFF" : colors.muted, fontWeight: "700" }}>
                  Enviar
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 14,
  },
  heroInfo: {
    flex: 1,
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  heroName: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    marginRight: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  heroDetails: {
    fontSize: 12,
    marginBottom: 4,
  },
  heroNotes: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  profileActionRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  profileActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  seeMoreLink: {
    fontSize: 12,
    fontWeight: "700",
  },
  activeWorkoutTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  activeWorkoutGoal: {
    fontSize: 12,
    marginBottom: 8,
  },
  divisionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  divisionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  divisionBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  evalDate: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  evalSummaryText: {
    fontSize: 13,
    marginBottom: 4,
  },
  evalNotesText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  emptyText: {
    fontSize: 12,
  },
  comparisonCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingBottom: 8,
    alignItems: "center",
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  tableCellName: {
    fontSize: 13,
    fontWeight: "600",
  },
  tableCell: {
    fontSize: 12,
  },
  deltaBadgeWrap: {},
  tableDeltaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tableDeltaText: {
    fontSize: 11,
    fontWeight: "700",
  },
  regionSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  regionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginRight: 8,
  },
  regionScroll: {
    gap: 6,
  },
  regionChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  regionChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  evalDetailCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  evalDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  evalDetailDate: {
    fontSize: 15,
    fontWeight: "700",
  },
  evalDetailProtocol: {
    fontSize: 12,
    fontWeight: "600",
  },
  evalDetailFat: {
    alignItems: "flex-end",
  },
  evalDetailFatNum: {
    fontSize: 20,
    fontWeight: "800",
  },
  evalDetailFatLbl: {
    fontSize: 10,
  },
  evalDetailMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  evalDetailMetricCol: {
    alignItems: "center",
  },
  evalDetailMetricLbl: {
    fontSize: 10,
    textTransform: "uppercase",
  },
  evalDetailMetricVal: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  circPreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  circItemText: {
    fontSize: 12,
  },
  evalNotesFull: {
    fontSize: 12,
    fontStyle: "italic",
  },
  workoutFullCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  workoutFullHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  workoutFullTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  workoutFullGoal: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  activeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    height: 24,
  },
  activeStatusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  workoutPlanNotes: {
    fontSize: 12,
    marginBottom: 12,
  },
  dayContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },
  dayHeader: {
    padding: 8,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  dayTargetMuscles: {
    fontSize: 11,
  },
  exerciseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
  },
  exerciseLeft: {
    flexDirection: "row",
    flex: 1,
    marginRight: 8,
  },
  exerciseIndex: {
    fontSize: 13,
    fontWeight: "700",
    marginRight: 6,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: "700",
  },
  exerciseNote: {
    fontSize: 11,
    marginTop: 1,
  },
  exerciseTelemetry: {
    alignItems: "flex-end",
  },
  exerciseSeriesReps: {
    fontSize: 13,
    fontWeight: "700",
  },
  exerciseLoad: {
    fontSize: 11,
    fontWeight: "600",
  },
  aiAnalysisCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  aiAnalysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  aiAnalysisTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  aiAnalysisText: {
    fontSize: 13,
    lineHeight: 19,
  },
  anamnesisCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  anamnesisItem: {
    marginBottom: 14,
  },
  anamnesisItemTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  anamnesisItemValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  historyTimeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 12,
  },
  timelineIconCol: {
    alignItems: "center",
    width: 24,
    marginRight: 10,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  timelineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: "700",
  },
  timelineDeltaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineDeltaText: {
    fontSize: 10,
    fontWeight: "800",
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  messagesContainer: {
    marginBottom: 14,
  },
  chatBubbleWrap: {
    marginBottom: 12,
    maxWidth: "85%",
  },
  chatBubbleLeft: {
    alignSelf: "flex-start",
  },
  chatBubbleRight: {
    alignSelf: "flex-end",
  },
  chatSenderLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chatBubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    paddingHorizontal: 8,
  },
  chatSendBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
}));
