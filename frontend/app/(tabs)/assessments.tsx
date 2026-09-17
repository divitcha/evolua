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
  Activity,
  PlusCircle,
  TrendingUp,
  Scale,
  Calendar,
  ChevronRight,
  Sparkles,
  Layers,
} from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";
import { MetricCard } from "@/src/components/MetricCard";
import { FilterChipRow, ChipOption } from "@/src/components/FilterChipRow";

const PROTOCOL_OPTIONS: ChipOption[] = [
  { id: "todos", label: "Todos os Protocolos" },
  { id: "pollock7", label: "Pollock 7 Dobras" },
  { id: "pollock3", label: "Pollock 3 Dobras" },
  { id: "circumferences", label: "Circunferências" },
];

export default function AssessmentsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedProtocol, setSelectedProtocol] = useState("todos");

  const { data: assessments = [], isLoading, refetch } = useQuery({
    queryKey: ["all-assessments"],
    queryFn: () => api.getAssessments(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-for-assessment"],
    queryFn: () => api.getStudents(),
  });

  const filteredAssessments = assessments.filter((a) => {
    if (selectedProtocol === "todos") return true;
    return a.protocol === selectedProtocol;
  });

  return (
    <View testID="assessments-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* CUSTOM HEADER MODELO 2 */}
      <View style={{ paddingTop: Math.max(insets.top, 24), paddingHorizontal: 24, paddingBottom: 16, backgroundColor: colors.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface, marginBottom: 4 }}>Avaliações Físicas</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>Protocolos Pollock 3 & 7 Dobras e Antropometria</Text>
        </View>
        <Pressable
          testID="btn-new-assessment-top"
          onPress={() => {
            if (students.length > 0) {
              router.push(`/students/${students[0].id}/assessment/new`);
            }
          }}
          style={{ backgroundColor: colors.brandPrimary, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24, gap: 8 }}
        >
          <PlusCircle size={16} color={colors.onBrandPrimary} />
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.onBrandPrimary }}>Nova Avaliação</Text>
        </Pressable>
      </View>

      {/* P0 FILTER CHIP ROW */}
      <FilterChipRow
        options={PROTOCOL_OPTIONS}
        selectedId={selectedProtocol}
        onSelect={setSelectedProtocol}
        testIDPrefix="protocol-filter"
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
        {/* PROTOCOLS EXPLANATION BANNER */}
        <View style={[styles.protocolInfoCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={styles.protocolInfoHeader}>
            <Layers size={20} color={colors.brandPrimary} />
            <Text style={[styles.protocolInfoTitle, { color: colors.onSurface }]}>
              Protocolos de Avaliação Rigorosos
            </Text>
          </View>
          <Text style={[styles.protocolInfoText, { color: colors.onSurfaceSecondary }]}>
            • <Text style={{ fontWeight: "700" }}>Pollock 3 Dobras:</Text> Jackson & Pollock com fórmula de Siri. Rápido e preciso para reavaliações mensais.{"\n"}
            • <Text style={{ fontWeight: "700" }}>Pollock 7 Dobras:</Text> Padrão ouro antropométrico com alta sensibilidade para hipertrofia e definição.{"\n"}
            • <Text style={{ fontWeight: "700" }}>Sem estimativas falsas:</Text> % de Gordura calculado exclusivamente via dobras cutâneas reais.
          </Text>
        </View>

        {/* QUICK SELECT STUDENT TO ASSESS */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Avaliar Aluno</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceSecondary }]}>
            Selecione para nova medição
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studentsQuickScroll}>
          {students.map((student) => (
            <Pressable
              key={student.id}
              testID={`quick-assess-student-${student.id}`}
              onPress={() => router.push(`/students/${student.id}/assessment/new`)}
              style={[styles.studentQuickCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <Text style={[styles.studentQuickName, { color: colors.onSurface }]} numberOfLines={1}>
                {student.name.split(" ")[0]}
              </Text>
              <Text style={[styles.studentQuickGoal, { color: colors.brandPrimary }]}>
                {student.goal}
              </Text>
              <View style={[styles.studentQuickBtn, { backgroundColor: colors.brandTertiary }]}>
                <PlusCircle size={12} color={colors.brandPrimary} />
                <Text style={[styles.studentQuickBtnText, { color: colors.brandPrimary }]}>Avaliar</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* RECENT ASSESSMENTS LIST */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Histórico Recente de Avaliações</Text>
        </View>

        {filteredAssessments.map((assessment) => {
          const student = students.find((s) => s.id === assessment.student_id);
          return (
            <Pressable
              key={assessment.id}
              testID={`assessment-card-${assessment.id}`}
              onPress={() => router.push(`/students/${assessment.student_id}`)}
              style={[styles.evalCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <View style={styles.evalCardHeader}>
                <View>
                  <Text style={[styles.evalStudentName, { color: colors.onSurface }]}>
                    {student ? student.name : "Aluno"}
                  </Text>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color={colors.muted} />
                    <Text style={[styles.evalDateText, { color: colors.muted }]}>{assessment.date}</Text>
                    <View style={[styles.protocolBadge, { backgroundColor: colors.brandTertiary }]}>
                      <Text style={[styles.protocolBadgeText, { color: colors.brandPrimary }]}>
                        {assessment.protocol.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.fatPctContainer}>
                  <Text style={[styles.fatPctVal, { color: colors.brandPrimary }]}>
                    {assessment.body_fat_pct}%
                  </Text>
                  <Text style={[styles.fatPctLabel, { color: colors.muted }]}>Gordura</Text>
                </View>
              </View>

              {/* METRICS ROW */}
              <View style={[styles.evalMetricsRow, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
                <View style={styles.evalMetricCol}>
                  <Text style={[styles.evalMetricLbl, { color: colors.muted }]}>Peso</Text>
                  <Text style={[styles.evalMetricNum, { color: colors.onSurface }]}>
                    {assessment.weight_kg} kg
                  </Text>
                </View>
                <View style={styles.evalMetricCol}>
                  <Text style={[styles.evalMetricLbl, { color: colors.muted }]}>Massa Magra</Text>
                  <Text style={[styles.evalMetricNum, { color: colors.success }]}>
                    {assessment.lean_mass_kg} kg
                  </Text>
                </View>
                <View style={styles.evalMetricCol}>
                  <Text style={[styles.evalMetricLbl, { color: colors.muted }]}>Massa Gorda</Text>
                  <Text style={[styles.evalMetricNum, { color: colors.warning }]}>
                    {assessment.fat_mass_kg} kg
                  </Text>
                </View>
                <View style={styles.evalMetricCol}>
                  <Text style={[styles.evalMetricLbl, { color: colors.muted }]}>IMC</Text>
                  <Text style={[styles.evalMetricNum, { color: colors.onSurface }]}>
                    {assessment.bmi}
                  </Text>
                </View>
              </View>

              {assessment.notes ? (
                <Text style={[styles.evalNotes, { color: colors.onSurfaceSecondary }]} numberOfLines={2}>
                  📝 {assessment.notes}
                </Text>
              ) : null}

              <View style={styles.evalFooter}>
                <Text style={[styles.evolutionLink, { color: colors.brandPrimary }]}>
                  Ver Evolução e Gráficos
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
  protocolInfoCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  protocolInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  protocolInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  protocolInfoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  studentsQuickScroll: {
    gap: 10,
    paddingBottom: 12,
  },
  studentQuickCard: {
    width: 120,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  studentQuickName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  studentQuickGoal: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
  },
  studentQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  studentQuickBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  evalCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  evalCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  evalStudentName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  evalDateText: {
    fontSize: 12,
  },
  protocolBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  protocolBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  fatPctContainer: {
    alignItems: "flex-end",
  },
  fatPctVal: {
    fontSize: 22,
    fontWeight: "800",
  },
  fatPctLabel: {
    fontSize: 11,
  },
  evalMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  evalMetricCol: {
    alignItems: "center",
  },
  evalMetricLbl: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  evalMetricNum: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  evalNotes: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  evalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  evolutionLink: {
    fontSize: 12,
    fontWeight: "700",
  },
}));
