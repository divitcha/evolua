import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Dumbbell,
  PlusCircle,
  Clock,
  Flame,
  ChevronRight,
  Repeat,
  Sparkles,
  CheckCircle2,
} from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";
import { FilterChipRow, ChipOption } from "@/src/components/FilterChipRow";

const WORKOUT_FILTER_OPTIONS: ChipOption[] = [
  { id: "todos", label: "Todos os Treinos" },
  { id: "hipertrofia", label: "Hipertrofia" },
  { id: "emagrecimento", label: "Emagrecimento" },
  { id: "definicao", label: "Definição" },
];

export default function WorkoutsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedFilter, setSelectedFilter] = useState("todos");

  const { data: workouts = [], isLoading, refetch } = useQuery({
    queryKey: ["all-workouts"],
    queryFn: () => api.getWorkouts(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-workouts"],
    queryFn: () => api.getStudents(),
  });

  return (
    <View testID="workouts-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* CUSTOM HEADER MODELO 2 */}
      <View style={{ paddingTop: Math.max(insets.top, 24), paddingHorizontal: 24, paddingBottom: 16, backgroundColor: colors.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface, marginBottom: 4 }}>Prescrição de Treinos</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>Divisões de Treino, Séries, Cargas e Cadência</Text>
        </View>
        <Pressable
          testID="btn-new-workout-top"
          onPress={() => {
            if (students.length > 0) {
              router.push(`/students/${students[0].id}/workout/new`);
            }
          }}
          style={{ backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, gap: 8 }}
        >
          <PlusCircle size={16} color={colors.onBrandPrimary} />
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.onBrandPrimary }}>Novo Treino</Text>
        </Pressable>
      </View>

      {/* P0 FILTER CHIP ROW */}
      <FilterChipRow
        options={WORKOUT_FILTER_OPTIONS}
        selectedId={selectedFilter}
        onSelect={setSelectedFilter}
        testIDPrefix="workout-filter"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.brandPrimary}
          />
        }
      >
        {/* AI WORKOUT GENERATOR CALLOUT */}
        <Pressable
          testID="ai-workout-generator-banner"
          onPress={() => router.push("/(tabs)/ai-coach")}
          style={[styles.aiBanner, { backgroundColor: colors.surfaceSecondary, borderColor: colors.brandPrimary }]}
        >
          <View style={styles.aiBannerLeft}>
            <Sparkles size={24} color={colors.brandPrimary} />
            <View style={styles.aiBannerTexts}>
              <Text style={[styles.aiBannerTitle, { color: colors.onSurface }]}>
                Gerador de Treinos com IA
              </Text>
              <Text style={[styles.aiBannerSubtitle, { color: colors.onSurfaceSecondary }]}>
                Prescreva rotinas ABC, ABCD e periodizações completas com base na anamnese.
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.brandPrimary} />
        </Pressable>

        {/* WORKOUT PLANS LIST */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Planos Ativos Prescritos</Text>
        </View>

        {workouts.map((workout) => {
          const student = students.find((s) => s.id === workout.student_id);
          const totalExercises = workout.days.reduce((acc, d) => acc + d.exercises.length, 0);

          return (
            <Pressable
              key={workout.id}
              testID={`workout-card-${workout.id}`}
              onPress={() => router.push(`/students/${workout.student_id}`)}
              style={[styles.workoutCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <View style={styles.workoutHeader}>
                <View style={styles.workoutHeaderLeft}>
                  <Text style={[styles.workoutTitle, { color: colors.onSurface }]}>
                    {workout.title}
                  </Text>
                  <Text style={[styles.studentAssigned, { color: colors.brandPrimary }]}>
                    Aluno: {student ? student.name : "Rodrigo Silva"}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <CheckCircle2 size={12} color={colors.success} style={{ marginRight: 4 }} />
                  <Text style={[styles.statusText, { color: colors.success }]}>Ativo</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Repeat size={12} color={colors.muted} />
                  <Text style={[styles.metaText, { color: colors.onSurfaceSecondary }]}>
                    {workout.frequency_weekly}x por semana
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Dumbbell size={12} color={colors.muted} />
                  <Text style={[styles.metaText, { color: colors.onSurfaceSecondary }]}>
                    {workout.days.length} Divisões ({totalExercises} exercícios)
                  </Text>
                </View>
              </View>

              {/* DIVISIONS PREVIEW */}
              <View style={styles.divisionsContainer}>
                {workout.days.map((day, idx) => (
                  <View key={day.id || idx} style={[styles.divisionPill, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
                    <Text style={[styles.divisionLabel, { color: colors.onSurface }]}>
                      {day.day_label}
                    </Text>
                    <Text style={[styles.divisionMuscles, { color: colors.muted }]} numberOfLines={1}>
                      {day.target_muscles}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.viewDetailsText, { color: colors.brandPrimary }]}>
                  Ver Ficha Completa de Exercícios
                </Text>
                <ChevronRight size={14} color={colors.brandPrimary} />
              </View>
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
  addHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  addHeaderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  aiBannerTexts: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  aiBannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  workoutCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  workoutHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  studentAssigned: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
  },
  divisionsContainer: {
    gap: 6,
    marginBottom: 12,
  },
  divisionPill: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  divisionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  divisionMuscles: {
    fontSize: 11,
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "700",
  },
}));
