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
import { Activity, Check, Plus, Camera, Layers } from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";
import { PhotoUploadField } from "@/src/components/PhotoUploadField";
import { AssessmentProtocol } from "@/src/types";

export default function NewAssessmentScreen() {
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

  const [protocol, setProtocol] = useState<AssessmentProtocol>("pollock7");
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [weightKg, setWeightKg] = useState(student ? String(student.weight_kg) : "80");
  const [heightCm, setHeightCm] = useState(student ? String(student.height_cm) : "178");
  const [age, setAge] = useState(student ? String(student.age || 28) : "28");
  const [gender, setGender] = useState(student ? student.gender : "Masculino");

  // Skinfolds (mm)
  const [peitoral, setPeitoral] = useState("12");
  const [axilarMedia, setAxilarMedia] = useState("11");
  const [triceps, setTriceps] = useState("10");
  const [subescapular, setSubescapular] = useState("15");
  const [abdomen, setAbdomen] = useState("16");
  const [suprailiaca, setSuprailiaca] = useState("12");
  const [coxa, setCoxa] = useState("14");
  const [manualFatPct, setManualFatPct] = useState("15.0");

  // Circumferences (cm)
  const [pescoco, setPescoco] = useState("39");
  const [ombros, setOmbros] = useState("120");
  const [torax, setTorax] = useState("106");
  const [cintura, setCintura] = useState("86");
  const [abdomenCirc, setAbdomenCirc] = useState("89");
  const [quadril, setQuadril] = useState("103");
  const [bracoDir, setBracoDir] = useState("39.0");
  const [bracoEsq, setBracoEsq] = useState("38.5");
  const [antebracoDir, setAntebracoDir] = useState("30.5");
  const [antebracoEsq, setAntebracoEsq] = useState("30.0");
  const [coxaDir, setCoxaDir] = useState("62.0");
  const [coxaEsq, setCoxaEsq] = useState("61.5");
  const [panturrilhaDir, setPanturrilhaDir] = useState("39.0");
  const [panturrilhaEsq, setPanturrilhaEsq] = useState("39.0");

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Photos (stored as backend file paths after upload)
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [backPhoto, setBackPhoto] = useState<string | null>(null);

  // Telemetry calculation
  const getSkinfoldsObj = () => ({
    peitoral: parseFloat(peitoral) || 0,
    axilar_media: parseFloat(axilarMedia) || 0,
    triceps: parseFloat(triceps) || 0,
    subescapular: parseFloat(subescapular) || 0,
    abdomen: parseFloat(abdomen) || 0,
    suprailiaca: parseFloat(suprailiaca) || 0,
    coxa: parseFloat(coxa) || 0,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.createAssessment({
        student_id: id as string,
        date: assessmentDate,
        weight_kg: parseFloat(weightKg) || 75,
        height_cm: parseFloat(heightCm) || 175,
        age: parseInt(age, 10) || 28,
        gender: gender as "Masculino" | "Feminino",
        protocol: protocol,
        skinfolds: getSkinfoldsObj(),
        circumferences: {
          pescoco: parseFloat(pescoco) || 0,
          ombros: parseFloat(ombros) || 0,
          torax: parseFloat(torax) || 0,
          cintura: parseFloat(cintura) || 0,
          abdomen: parseFloat(abdomenCirc) || 0,
          quadril: parseFloat(quadril) || 0,
          braco_dir: parseFloat(bracoDir) || 0,
          braco_esq: parseFloat(bracoEsq) || 0,
          antebraco_dir: parseFloat(antebracoDir) || 0,
          antebraco_esq: parseFloat(antebracoEsq) || 0,
          coxa_dir: parseFloat(coxaDir) || 0,
          coxa_esq: parseFloat(coxaEsq) || 0,
          panturrilha_dir: parseFloat(panturrilhaDir) || 0,
          panturrilha_esq: parseFloat(panturrilhaEsq) || 0,
        },
        photos: {
          front: frontPhoto,
          side: sidePhoto,
          back: backPhoto,
        },        body_fat_pct: protocol === "manual" ? parseFloat(manualFatPct) || 15 : undefined,
        notes: notes,
      });

      queryClient.invalidateQueries({ queryKey: ["student-assessments", id] });
      queryClient.invalidateQueries({ queryKey: ["student-evolution", id] });
      queryClient.invalidateQueries({ queryKey: ["student-history", id] });
      queryClient.invalidateQueries({ queryKey: ["student-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["all-assessments"] });

      router.back();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View testID="new-assessment-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title="Nova Avaliação Física"
        subtitle={`Aluno: ${student?.name || "Aluno"}`}
        showBack
        testID="new-assessment-header"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 50 },
        ]}
      >
        {/* PROTOCOL SELECTOR */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Protocolo Antropométrico</Text>
        </View>

        <View style={styles.protocolGrid}>
          {[
            { id: "pollock7", label: "Pollock 7 Dobras", desc: "Padrão ouro de precisão" },
            { id: "pollock3", label: "Pollock 3 Dobras", desc: "Rápido para homens/mulheres" },
            { id: "circumferences", label: "Circunferências", desc: "Medidas corporais" },
            { id: "manual", label: "Manual", desc: "Informar % direto" },
          ].map((item) => (
            <Pressable
              key={item.id}
              testID={`select-protocol-${item.id}`}
              onPress={() => setProtocol(item.id as AssessmentProtocol)}
              style={[
                styles.protocolCard,
                {
                  backgroundColor: protocol === item.id ? colors.brandPrimary : colors.surfaceSecondary,
                  borderColor: protocol === item.id ? colors.brandPrimary : colors.border,
                },
              ]}
            >
              <Text style={[styles.protocolLabel, { color: protocol === item.id ? "#FFF" : colors.onSurface }]}>
                {item.label}
              </Text>
              <Text style={[styles.protocolDesc, { color: protocol === item.id ? "rgba(255,255,255,0.8)" : colors.onSurfaceSecondary }]}>
                {item.desc}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* BASIC PARAMETERS */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Dados da Avaliação</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Data</Text>
            <TextInput
              testID="input-eval-date"
              value={assessmentDate}
              onChangeText={setAssessmentDate}
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Peso (kg) *</Text>
            <TextInput
              testID="input-eval-weight"
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* SKINFOLDS SECTION (DOBRAS CUTÂNEAS) */}
        {(protocol === "pollock7" || protocol === "pollock3") && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                Dobras Cutâneas (milímetros - mm)
              </Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Peitoral (mm)</Text>
                <TextInput
                  testID="input-skinfold-peitoral"
                  value={peitoral}
                  onChangeText={setPeitoral}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
                />
              </View>

              {protocol === "pollock7" && (
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.onSurface }]}>Axilar Média (mm)</Text>
                  <TextInput
                    testID="input-skinfold-axilar"
                    value={axilarMedia}
                    onChangeText={setAxilarMedia}
                    keyboardType="numeric"
                    style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
                  />
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Tríceps (mm)</Text>
                <TextInput
                  testID="input-skinfold-triceps"
                  value={triceps}
                  onChangeText={setTriceps}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
                />
              </View>

              {protocol === "pollock7" && (
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.onSurface }]}>Subescapular (mm)</Text>
                  <TextInput
                    testID="input-skinfold-subescapular"
                    value={subescapular}
                    onChangeText={setSubescapular}
                    keyboardType="numeric"
                    style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
                  />
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Abdômen (mm)</Text>
                <TextInput
                  testID="input-skinfold-abdomen"
                  value={abdomen}
                  onChangeText={setAbdomen}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Suprailíaca (mm)</Text>
                <TextInput
                  testID="input-skinfold-suprailiaca"
                  value={suprailiaca}
                  onChangeText={setSuprailiaca}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Coxa (mm)</Text>
                <TextInput
                  testID="input-skinfold-coxa"
                  value={coxa}
                  onChangeText={setCoxa}
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
                />
              </View>
            </View>
          </View>
        )}

        {/* MANUAL FAT PERCENTAGE */}
        {protocol === "manual" && (
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.onSurface }]}>% de Gordura Corporal Informado</Text>
            <TextInput
              testID="input-manual-fat"
              value={manualFatPct}
              onChangeText={setManualFatPct}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        )}

        {/* CIRCUMFERENCES SECTION */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Circunferências Corporais (cm)</Text>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Pescoço (cm)</Text>
            <TextInput
              testID="input-circ-pescoco"
              value={pescoco}
              onChangeText={setPescoco}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Ombros (cm)</Text>
            <TextInput
              testID="input-circ-ombros"
              value={ombros}
              onChangeText={setOmbros}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Tórax (cm)</Text>
            <TextInput
              testID="input-circ-torax"
              value={torax}
              onChangeText={setTorax}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Cintura (cm)</Text>
            <TextInput
              testID="input-circ-cintura"
              value={cintura}
              onChangeText={setCintura}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Abdômen (cm)</Text>
            <TextInput
              testID="input-circ-abdomen"
              value={abdomenCirc}
              onChangeText={setAbdomenCirc}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Quadril (cm)</Text>
            <TextInput
              testID="input-circ-quadril"
              value={quadril}
              onChangeText={setQuadril}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Braço Dir (cm)</Text>
            <TextInput
              testID="input-circ-braco-dir"
              value={bracoDir}
              onChangeText={setBracoDir}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Braço Esq (cm)</Text>
            <TextInput
              testID="input-circ-braco-esq"
              value={bracoEsq}
              onChangeText={setBracoEsq}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Coxa Dir (cm)</Text>
            <TextInput
              testID="input-circ-coxa-dir"
              value={coxaDir}
              onChangeText={setCoxaDir}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Coxa Esq (cm)</Text>
            <TextInput
              testID="input-circ-coxa-esq"
              value={coxaEsq}
              onChangeText={setCoxaEsq}
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
            />
          </View>
        </View>

        {/* FOTOS DE EVOLUÇÃO */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Fotos de Evolução</Text>
          <Text style={[styles.sectionHint, { color: colors.onSurfaceSecondary }]}>
            Registre frente, lateral e costas para comparar o antes e depois.
          </Text>
        </View>
        <View style={styles.photosRow}>
          <PhotoUploadField label="Frente" value={frontPhoto} onChange={setFrontPhoto} testID="photo-front" />
          <PhotoUploadField label="Lateral" value={sidePhoto} onChange={setSidePhoto} testID="photo-side" />
          <PhotoUploadField label="Costas" value={backPhoto} onChange={setBackPhoto} testID="photo-back" />
        </View>

        {/* OBSERVAÇÕES */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Observações e Parecer Técnico</Text>
          <TextInput
            testID="input-eval-notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: Excelente evolução na redução de dobras abdominais e manutenção da massa muscular..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
            style={[styles.textArea, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, color: colors.onSurface }]}
          />
        </View>

        {/* SAVE BUTTON */}
        <Pressable
          testID="btn-submit-save-assessment"
          onPress={handleSave}
          disabled={saving}
          style={[styles.submitButton, { backgroundColor: colors.brandPrimary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Check size={18} color="#FFF" />
              <Text style={styles.submitButtonText}>Calcular e Salvar Avaliação</Text>
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
  sectionHeader: {
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  sectionHint: {
    fontSize: 12,
    marginTop: 2,
  },
  photosRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  protocolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  protocolCard: {
    width: "48%",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  protocolLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  protocolDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
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
    minHeight: 70,
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
    marginTop: 14,
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
}));
