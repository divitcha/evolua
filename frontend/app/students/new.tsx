import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Check, X, Camera } from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";
import { StudentGoal, TrainingLevel, PlanType } from "@/src/types";

const GOALS: StudentGoal[] = [
  "Hipertrofia",
  "Emagrecimento",
  "Definição",
  "Condicionamento",
  "Saúde / Qualidade de Vida",
  "Reabilitação",
];

const LEVELS: TrainingLevel[] = ["Iniciante", "Intermediário", "Avançado", "Atleta"];
const PLANS: PlanType[] = ["Mensal", "Trimestral", "Semestral", "Anual"];

export default function NewStudentScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400");
  const [birthDate, setBirthDate] = useState("1996-08-15");
  const [gender, setGender] = useState<"Masculino" | "Feminino">("Masculino");
  const [phone, setPhone] = useState("(11) 98765-4321");
  const [email, setEmail] = useState("");
  const [heightCm, setHeightCm] = useState("175");
  const [weightKg, setWeightKg] = useState("78");
  const [goal, setGoal] = useState<StudentGoal>("Hipertrofia");
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>("Intermediário");
  const [plan, setPlan] = useState<PlanType>("Mensal");
  const [monthlyFee, setMonthlyFee] = useState("250");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      return;
    }
    setLoading(true);
    try {
      const newStudent = await api.createStudent({
        name: name.trim(),
        photo_url: photoUrl,
        birth_date: birthDate,
        gender: gender,
        phone: phone,
        email: email || `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
        height_cm: parseFloat(heightCm) || 175,
        weight_kg: parseFloat(weightKg) || 75,
        goal: goal,
        training_level: trainingLevel,
        start_date: new Date().toISOString().split("T")[0],
        plan: plan,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        monthly_fee: parseFloat(monthlyFee) || 250,
        status: "ativo",
        notes: notes,
      });

      queryClient.invalidateQueries({ queryKey: ["students-list"] });
      queryClient.invalidateQueries({ queryKey: ["students-full-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      router.replace(`/students/${newStudent.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View testID="new-student-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title="Cadastrar Aluno"
        subtitle="Adicione informações completas do aluno"
        showBack
        testID="new-student-header"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
      >
        {/* NOME COMPLETO */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Nome Completo *</Text>
          <TextInput
            testID="input-student-name"
            value={name}
            onChangeText={setName}
            placeholder="Ex: Gabriel Santos Silva"
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* FOTO E SEXO */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Sexo</Text>
            <View style={styles.segmentedRow}>
              {(["Masculino", "Feminino"] as const).map((g) => (
                <Pressable
                  key={g}
                  testID={`select-gender-${g.toLowerCase()}`}
                  onPress={() => setGender(g)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: gender === g ? colors.brandPrimary : colors.surfaceSecondary,
                      borderColor: gender === g ? colors.brandPrimary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: gender === g ? "#FFF" : colors.onSurface }]}>
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Data de Nascimento</Text>
            <TextInput
              testID="input-student-birth"
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* CONTATO: TELEFONE E EMAIL */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Telefone / WhatsApp *</Text>
            <TextInput
              testID="input-student-phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(11) 99999-9999"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>E-mail</Text>
            <TextInput
              testID="input-student-email"
              value={email}
              onChangeText={setEmail}
              placeholder="aluno@email.com"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* ANTROPOMETRIA BÁSICA: PESO E ALTURA */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Peso Atual (kg)</Text>
            <TextInput
              testID="input-student-weight"
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="75.0"
              keyboardType="numeric"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Altura (cm)</Text>
            <TextInput
              testID="input-student-height"
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="175"
              keyboardType="numeric"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* OBJETIVO DO ALUNO */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Objetivo Principal</Text>
          <View style={styles.chipGrid}>
            {GOALS.map((g) => (
              <Pressable
                key={g}
                testID={`select-goal-${g}`}
                onPress={() => setGoal(g)}
                style={[
                  styles.choiceChip,
                  {
                    backgroundColor: goal === g ? colors.brandPrimary : colors.surfaceSecondary,
                    borderColor: goal === g ? colors.brandPrimary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.choiceChipText, { color: goal === g ? "#FFF" : colors.onSurface }]}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* NÍVEL DE TREINAMENTO */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Nível de Treinamento</Text>
          <View style={styles.segmentedRow}>
            {LEVELS.map((lvl) => (
              <Pressable
                key={lvl}
                testID={`select-level-${lvl}`}
                onPress={() => setTrainingLevel(lvl)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: trainingLevel === lvl ? colors.brandPrimary : colors.surfaceSecondary,
                    borderColor: trainingLevel === lvl ? colors.brandPrimary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.segmentText, { color: trainingLevel === lvl ? "#FFF" : colors.onSurface }]}>
                  {lvl}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* PLANO E MENSALIDADE */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Plano</Text>
            <View style={styles.segmentedRow}>
              {PLANS.map((p) => (
                <Pressable
                  key={p}
                  testID={`select-plan-${p}`}
                  onPress={() => setPlan(p)}
                  style={[
                    styles.segmentBtn,
                    {
                      backgroundColor: plan === p ? colors.brandPrimary : colors.surfaceSecondary,
                      borderColor: plan === p ? colors.brandPrimary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: plan === p ? "#FFF" : colors.onSurface }]}>
                    {p}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.formGroup, { flex: 0.7 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Valor Mensal (R$)</Text>
            <TextInput
              testID="input-student-fee"
              value={monthlyFee}
              onChangeText={setMonthlyFee}
              placeholder="250.00"
              keyboardType="numeric"
              placeholderTextColor={colors.muted}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* OBSERVAÇÕES DO PERSONAL */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Observações Iniciais do Personal</Text>
          <TextInput
            testID="input-student-notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: Histórico de lesão no ombro, foco em peitorais e recomposição corporal..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* SUBMIT BUTTON */}
        <Pressable
          testID="btn-submit-create-student"
          onPress={handleSave}
          disabled={loading || !name.trim()}
          style={[
            styles.submitButton,
            { backgroundColor: name.trim() ? colors.brandPrimary : colors.surfaceTertiary },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Check size={18} color="#FFF" />
              <Text style={styles.submitButtonText}>Salvar e Abrir Perfil</Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 11,
    fontWeight: "700",
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  choiceChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
}));
