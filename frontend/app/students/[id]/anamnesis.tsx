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
import { FileText, Sparkles, Check } from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";

export default function AnamnesisScreen() {
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

  const { data: anamnesisData, isLoading } = useQuery({
    queryKey: ["student-anamnesis", id],
    queryFn: () => api.getAnamnesis(id as string),
    enabled: !!id,
  });

  const [goal, setGoal] = useState("");
  const [trainingHistory, setTrainingHistory] = useState("");
  const [injuries, setInjuries] = useState("");
  const [surgeries, setSurgeries] = useState("");
  const [medications, setMedications] = useState("");
  const [habits, setHabits] = useState("");
  const [routine, setRoutine] = useState("");
  const [experience, setExperience] = useState("");
  const [restrictions, setRestrictions] = useState("");
  const [dietNotes, setDietNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");

  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningAI, setRunningAI] = useState(false);

  // Initialize fields once data is loaded
  if (anamnesisData && !initialized) {
    setGoal(anamnesisData.goal || student?.goal || "");
    setTrainingHistory(anamnesisData.training_history || "");
    setInjuries(anamnesisData.injuries || "Nenhuma lesão grave.");
    setSurgeries(anamnesisData.surgeries || "Nenhuma.");
    setMedications(anamnesisData.medications || "Nenhum.");
    setHabits(anamnesisData.habits || "Dorme 7-8h/noite, boa hidratação.");
    setRoutine(anamnesisData.routine || "Trabalha sentado em escritório.");
    setExperience(anamnesisData.experience_weightlifting || student?.training_level || "Intermediário");
    setRestrictions(anamnesisData.restrictions || "Nenhuma restrição grave.");
    setDietNotes(anamnesisData.diet_notes || "");
    setNotes(anamnesisData.notes || "");
    setAiAnalysis(anamnesisData.ai_analysis || "");
    setInitialized(true);
  }

  const handleRunAIAnalysis = async () => {
    setRunningAI(true);
    try {
      const prompt = `Analise a anamnese deste aluno:
Objetivo: ${goal}
Histórico: ${trainingHistory}
Lesões: ${injuries}
Medicamentos: ${medications}
Hábitos/Sono: ${habits}
Rotina: ${routine}
Experiência: ${experience}
Restrições: ${restrictions}

Forneça um parecer técnico sucinto com recomendações biomecânicas e de segurança para o Personal Trainer.`;

      const res = await api.askAIAssistant(prompt);
      setAiAnalysis(res.reply);
    } catch (e) {
      console.error(e);
    } finally {
      setRunningAI(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveAnamnesis(id as string, {
        goal,
        training_history: trainingHistory,
        injuries,
        surgeries,
        medications,
        habits,
        routine,
        experience_weightlifting: experience,
        restrictions,
        diet_notes: dietNotes,
        notes,
        ai_analysis: aiAnalysis,
      });

      queryClient.invalidateQueries({ queryKey: ["student-anamnesis", id] });
      queryClient.invalidateQueries({ queryKey: ["student-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["student-history", id] });

      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View testID="anamnesis-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title="Formulário de Anamnese"
        subtitle={`Aluno: ${student?.name || "Aluno"}`}
        showBack
        testID="anamnesis-header"
        rightElement={
          <Pressable
            testID="btn-ai-analyze-anamnesis"
            onPress={handleRunAIAnalysis}
            disabled={runningAI}
            style={[styles.aiBtn, { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary }]}
          >
            {runningAI ? (
              <ActivityIndicator size="small" color={colors.brandPrimary} />
            ) : (
              <>
                <Sparkles size={14} color={colors.brandPrimary} />
                <Text style={[styles.aiBtnText, { color: colors.brandPrimary }]}>Análise IA</Text>
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
        {/* AI ANALYSIS CALLOUT */}
        {aiAnalysis ? (
          <View style={[styles.aiCard, { backgroundColor: "rgba(255, 87, 34, 0.1)", borderColor: colors.brandPrimary }]}>
            <View style={styles.aiCardHeader}>
              <Sparkles size={16} color={colors.brandPrimary} />
              <Text style={[styles.aiCardTitle, { color: colors.brandPrimary }]}>
                Parecer Fisiológico da IA
              </Text>
            </View>
            <Text style={[styles.aiCardBody, { color: colors.onSurface }]}>{aiAnalysis}</Text>
          </View>
        ) : null}

        {/* GOAL */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Objetivo Principal do Aluno</Text>
          <TextInput
            testID="input-anamnesis-goal"
            value={goal}
            onChangeText={setGoal}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* TRAINING HISTORY */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Histórico de Treinamento e Esportes</Text>
          <TextInput
            testID="input-anamnesis-history"
            value={trainingHistory}
            onChangeText={setTrainingHistory}
            placeholder="Ex: Pratica musculação há 2 anos, fez natação..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={2}
            style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* INJURIES AND SURGERIES */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Lesões / Dores</Text>
            <TextInput
              testID="input-anamnesis-injuries"
              value={injuries}
              onChangeText={setInjuries}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Cirurgias Prévias</Text>
            <TextInput
              testID="input-anamnesis-surgeries"
              value={surgeries}
              onChangeText={setSurgeries}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* MEDICATIONS & HABITS */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Medicamentos / Suplementos</Text>
          <TextInput
            testID="input-anamnesis-medications"
            value={medications}
            onChangeText={setMedications}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Hábitos, Sono e Hidratação</Text>
          <TextInput
            testID="input-anamnesis-habits"
            value={habits}
            onChangeText={setHabits}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* ROUTINE & RESTRICTIONS */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Rotina Diária e Profissão</Text>
          <TextInput
            testID="input-anamnesis-routine"
            value={routine}
            onChangeText={setRoutine}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Restrições e Cuidados Posturais</Text>
          <TextInput
            testID="input-anamnesis-restrictions"
            value={restrictions}
            onChangeText={setRestrictions}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* DIET NOTES */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Observações sobre Alimentação</Text>
          <TextInput
            testID="input-anamnesis-diet"
            value={dietNotes}
            onChangeText={setDietNotes}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* SAVE BUTTON */}
        <Pressable
          testID="btn-save-anamnesis"
          onPress={handleSave}
          disabled={saving}
          style={[styles.submitButton, { backgroundColor: colors.brandPrimary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Check size={18} color="#FFF" />
              <Text style={styles.submitButtonText}>Salvar Anamnese</Text>
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
  aiBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  aiBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  aiCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  aiCardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  aiCardBody: {
    fontSize: 13,
    lineHeight: 19,
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
    minHeight: 60,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
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
