import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Plus, Trash2, Sparkles, Check } from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";
import { WorkoutRoutineDay, ExerciseItem } from "@/src/types";

export default function NewWorkoutScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: student } = useQuery({
    queryKey: ["student-detail", id],
    queryFn: () => api.getStudent(id as string),
    enabled: !!id,
  });

  const [title, setTitle] = useState("Hipertrofia ABC - Foco em Sobrecarga");
  const [goal, setGoal] = useState(student ? student.goal : "Hipertrofia");
  const [freqWeekly, setFreqWeekly] = useState("4");
  const [notes, setNotes] = useState("Manter intervalo de 48h para o mesmo grupo muscular.");

  const [days, setDays] = useState<WorkoutRoutineDay[]>([
    {
      id: "day_a",
      day_label: "Treino A - Peito, Ombros e Tríceps",
      target_muscles: "Peitoral, Deltoide, Tríceps",
      exercises: [
        {
          id: "ex_1",
          name: "Supino Reto com Barra",
          sets: 4,
          reps: "8-10",
          load_kg: 80,
          rest_seconds: 90,
          tempo: "2-0-2",
          notes: "Escápulas travadas no banco",
        },
        {
          id: "ex_2",
          name: "Supino Inclinado Halteres",
          sets: 3,
          reps: "10-12",
          load_kg: 28,
          rest_seconds: 60,
          tempo: "3-0-1",
          notes: "Foco no feixe clavicular",
        },
        {
          id: "ex_3",
          name: "Desenvolvimento Halteres",
          sets: 4,
          reps: "10",
          load_kg: 20,
          rest_seconds: 60,
          tempo: "2-0-2",
          notes: "Sem bater os halteres no topo",
        },
      ],
    },
    {
      id: "day_b",
      day_label: "Treino B - Costas e Bíceps",
      target_muscles: "Dorsais, Trapézio, Bíceps",
      exercises: [
        {
          id: "ex_4",
          name: "Puxada Frontal Aberta",
          sets: 4,
          reps: "10-12",
          load_kg: 65,
          rest_seconds: 60,
          tempo: "2-1-2",
          notes: "Puxar com o cotovelo",
        },
        {
          id: "ex_5",
          name: "Remada Curvada com Barra",
          sets: 4,
          reps: "8-10",
          load_kg: 60,
          rest_seconds: 90,
          tempo: "2-0-2",
          notes: "Manter lombar alinhada",
        },
      ],
    },
  ]);

  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddDay = () => {
    const nextChar = String.fromCharCode(65 + days.length); // C, D, etc.
    setDays((prev) => [
      ...prev,
      {
        id: `day_${Date.now()}`,
        day_label: `Treino ${nextChar} - Pernas e Abdômen`,
        target_muscles: "Quadríceps, Isquiotibiais, Panturrilhas, Core",
        exercises: [
          {
            id: `ex_${Date.now()}`,
            name: "Agachamento Livre",
            sets: 4,
            reps: "8-10",
            load_kg: 80,
            rest_seconds: 120,
            tempo: "3-0-2",
            notes: "Amplitude máxima controlada",
          },
        ],
      },
    ]);
  };

  const handleAddExercise = (dayIdx: number) => {
    setDays((prev) => {
      const copy = [...prev];
      copy[dayIdx].exercises.push({
        id: `ex_${Date.now()}`,
        name: "Novo Exercício",
        sets: 3,
        reps: "10-12",
        load_kg: 20,
        rest_seconds: 60,
        tempo: "2-0-2",
        notes: "",
      });
      return copy;
    });
  };

  const handleRemoveExercise = (dayIdx: number, exIdx: number) => {
    setDays((prev) => {
      const copy = [...prev];
      copy[dayIdx].exercises.splice(exIdx, 1);
      return copy;
    });
  };

  const handleUpdateExercise = (
    dayIdx: number,
    exIdx: number,
    field: keyof ExerciseItem,
    val: any
  ) => {
    setDays((prev) => {
      const copy = [...prev];
      (copy[dayIdx].exercises[exIdx] as any)[field] = val;
      return copy;
    });
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      const prompt = `Gere uma divisão de treino completa para o aluno ${student?.name || "Aluno"}, objetivo ${goal}, nível ${student?.training_level || "Intermediário"}, frequência semanal de ${freqWeekly} dias. Retorne observações técnicas objetivas.`;
      const res = await api.askAIAssistant(prompt);
      setNotes((prev) => `${prev}\n\n💡 Sugestão da IA:\n${res.reply.substring(0, 300)}...`);
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.createWorkout({
        student_id: id as string,
        title: title.trim(),
        goal: goal,
        frequency_weekly: parseInt(freqWeekly, 10) || 4,
        start_date: new Date().toISOString().split("T")[0],
        days: days,
        notes: notes,
        is_active: true,
      });

      queryClient.invalidateQueries({ queryKey: ["student-workouts", id] });
      queryClient.invalidateQueries({ queryKey: ["student-history", id] });
      queryClient.invalidateQueries({ queryKey: ["student-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["all-workouts"] });

      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View testID="new-workout-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title="Prescrever Treino"
        subtitle={`Aluno: ${student?.name || "Aluno"}`}
        showBack
        testID="new-workout-header"
        rightElement={
          <Pressable
            testID="btn-ai-suggest-workout"
            onPress={handleGenerateAI}
            disabled={generatingAI}
            style={[styles.aiSuggestBtn, { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary }]}
          >
            {generatingAI ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <>
                <Sparkles size={14} color={colors.brandPrimary} />
                <Text style={[styles.aiSuggestText, { color: colors.brandPrimary }]}>Sugerir c/ IA</Text>
              </>
            )}
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 60 },
        ]}
      >
        {/* WORKOUT BASIC INFO */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Título do Programa *</Text>
          <TextInput
            testID="input-workout-title"
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Frequência Semanal</Text>
            <TextInput
              testID="input-workout-frequency"
              value={freqWeekly}
              onChangeText={setFreqWeekly}
              keyboardType="numeric"
              placeholder="Ex: 4"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Objetivo</Text>
            <TextInput
              testID="input-workout-goal"
              value={goal}
              onChangeText={setGoal}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* DIVISIONS & EXERCISES */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Divisões de Treino</Text>
          <Pressable
            testID="btn-add-division"
            onPress={handleAddDay}
            style={[styles.addDivBtn, { backgroundColor: colors.brandTertiary }]}
          >
            <Plus size={14} color={colors.brandPrimary} />
            <Text style={[styles.addDivText, { color: colors.brandPrimary }]}>+ Divisão</Text>
          </Pressable>
        </View>

        {days.map((day, dIdx) => (
          <View key={day.id || dIdx} style={[styles.dayCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.dayTop}>
              <TextInput
                testID={`input-day-label-${dIdx}`}
                value={day.day_label}
                onChangeText={(text) => {
                  setDays((prev) => {
                    const copy = [...prev];
                    copy[dIdx].day_label = text;
                    return copy;
                  });
                }}
                style={[styles.dayLabelInput, { color: colors.onSurface, borderColor: colors.border }]}
              />
            </View>

            {/* EXERCISES LIST */}
            {day.exercises.map((ex, eIdx) => (
              <View key={ex.id || eIdx} style={[styles.exerciseBox, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
                <View style={styles.exHeader}>
                  <TextInput
                    testID={`input-ex-name-${dIdx}-${eIdx}`}
                    value={ex.name}
                    onChangeText={(val) => handleUpdateExercise(dIdx, eIdx, "name", val)}
                    placeholder="Nome do Exercício"
                    placeholderTextColor={colors.muted}
                    style={[styles.exNameInput, { color: colors.onSurface }]}
                  />
                  <Pressable
                    testID={`btn-delete-ex-${dIdx}-${eIdx}`}
                    onPress={() => handleRemoveExercise(dIdx, eIdx)}
                  >
                    <Trash2 size={16} color={colors.error} />
                  </Pressable>
                </View>

                {/* TELEMETRY INPUTS: SETS, REPS, LOAD, REST */}
                <View style={styles.telemetryGrid}>
                  <View style={styles.telItem}>
                    <Text style={[styles.telLabel, { color: colors.muted }]}>Séries</Text>
                    <TextInput
                      value={String(ex.sets)}
                      onChangeText={(val) => handleUpdateExercise(dIdx, eIdx, "sets", parseInt(val, 10) || 0)}
                      keyboardType="numeric"
                      style={[styles.telInput, { color: colors.onSurface, borderColor: colors.border }]}
                    />
                  </View>

                  <View style={styles.telItem}>
                    <Text style={[styles.telLabel, { color: colors.muted }]}>Reps</Text>
                    <TextInput
                      value={ex.reps}
                      onChangeText={(val) => handleUpdateExercise(dIdx, eIdx, "reps", val)}
                      style={[styles.telInput, { color: colors.onSurface, borderColor: colors.border }]}
                    />
                  </View>

                  <View style={styles.telItem}>
                    <Text style={[styles.telLabel, { color: colors.muted }]}>Carga (kg)</Text>
                    <TextInput
                      value={String(ex.load_kg || 0)}
                      onChangeText={(val) => handleUpdateExercise(dIdx, eIdx, "load_kg", parseFloat(val) || 0)}
                      keyboardType="numeric"
                      style={[styles.telInput, { color: colors.onSurface, borderColor: colors.border }]}
                    />
                  </View>

                  <View style={styles.telItem}>
                    <Text style={[styles.telLabel, { color: colors.muted }]}>Descanso (s)</Text>
                    <TextInput
                      value={String(ex.rest_seconds)}
                      onChangeText={(val) => handleUpdateExercise(dIdx, eIdx, "rest_seconds", parseInt(val, 10) || 0)}
                      keyboardType="numeric"
                      style={[styles.telInput, { color: colors.onSurface, borderColor: colors.border }]}
                    />
                  </View>
                </View>

                <TextInput
                  value={ex.notes || ""}
                  onChangeText={(val) => handleUpdateExercise(dIdx, eIdx, "notes", val)}
                  placeholder="Observação (Ex: Cadência 3-0-1, pico de contração)..."
                  placeholderTextColor={colors.muted}
                  style={[styles.exNotesInput, { color: colors.onSurface, borderColor: colors.border }]}
                />
              </View>
            ))}

            <Pressable
              testID={`btn-add-exercise-day-${dIdx}`}
              onPress={() => handleAddExercise(dIdx)}
              style={[styles.addExBtn, { borderColor: colors.brandPrimary }]}
            >
              <Plus size={14} color={colors.brandPrimary} />
              <Text style={[styles.addExText, { color: colors.brandPrimary }]}>Adicionar Exercício</Text>
            </Pressable>
          </View>
        ))}

        {/* NOTES */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Observações Gerais do Treino</Text>
          <TextInput
            testID="input-workout-notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* SUBMIT BUTTON */}
        <Pressable
          testID="btn-submit-workout"
          onPress={handleSave}
          disabled={saving}
          style={[styles.submitButton, { backgroundColor: colors.brandPrimary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Check size={18} color="#FFF" />
              <Text style={styles.submitButtonText}>Salvar e Ativar Treino</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
  },
  aiSuggestBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  aiSuggestText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  addDivBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  addDivText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dayCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  dayTop: {
    marginBottom: 10,
  },
  dayLabelInput: {
    fontSize: 14,
    fontWeight: "700",
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  exerciseBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  exHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  exNameInput: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  telemetryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
  },
  telItem: {
    flex: 1,
  },
  telLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  telInput: {
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  exNotesInput: {
    fontSize: 11,
    borderTopWidth: 1,
    paddingTop: 4,
  },
  addExBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
    gap: 4,
  },
  addExText: {
    fontSize: 12,
    fontWeight: "700",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
}));
