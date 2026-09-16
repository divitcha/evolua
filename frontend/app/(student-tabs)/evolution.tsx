import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrendingDown, TrendingUp, Activity } from "lucide-react-native";

import { useTheme } from "@/src/theme";
import { api } from "@/src/api/client";

export default function StudentEvolutionScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.getStudentDashboard().then(setData).catch(console.error);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface }}>
          Evolução Corporal
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
          Acompanhe seus resultados (Dobras Cutâneas)
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, gap: 16 }}>
        
        {/* Gráfico Simulado */}
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.onSurface, marginBottom: 16 }}>
            Gordura Corporal (%)
          </Text>
          <View style={{ height: 120, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
            {[25, 23, 21, 19, 17, 15].map((val, idx) => (
              <View key={idx} style={{ flex: 1, alignItems: "center" }}>
                <View style={{ width: "100%", height: `${(val / 30) * 100}%`, backgroundColor: idx === 5 ? colors.brandPrimary : colors.surfaceTertiary, borderRadius: 4 }} />
                <Text style={{ fontSize: 10, color: colors.muted, marginTop: 8 }}>Mês {idx + 1}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Resumo atual */}
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={[styles.metricCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TrendingDown size={18} color={colors.success} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>Peso Atual</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.onSurface, marginTop: 8 }}>
              {data?.metrics?.weight_kg || "--"} kg
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Activity size={18} color={colors.info} />
              <Text style={{ color: colors.muted, fontSize: 12 }}>% Gordura</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.onSurface, marginTop: 8 }}>
              {data?.metrics?.body_fat_pct || "--"} %
            </Text>
          </View>
        </View>

        {/* Mensagem Motivacional */}
        <View style={[styles.card, { backgroundColor: colors.brandTertiary, borderWidth: 0 }]}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.brandPrimary, marginBottom: 8 }}>
            Continue assim!
          </Text>
          <Text style={{ fontSize: 14, color: colors.onSurface, lineHeight: 20 }}>
            Sua próxima avaliação de Pollock 7 dobras está agendada para semana que vem. Mantenha a dieta em dia!
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  }
});
