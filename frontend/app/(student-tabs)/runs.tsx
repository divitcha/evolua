import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Activity, MapPin, Clock, Flame } from "lucide-react-native";

import { useTheme } from "@/src/theme";
import { api } from "@/src/api/client";

export default function StudentRunsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    try {
      const res = await api.getRuns();
      setRuns(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleAddMockRun = async () => {
    try {
      await api.logRun({
        distance_km: 5.2,
        duration_min: 30,
        calories_kcal: 400,
      });
      fetchRuns();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface }}>
          Desempenho na Corrida
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
          Acompanhe suas rotas e tempos
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, gap: 12 }}>
        {runs.length === 0 ? (
          <View style={{ padding: 30, alignItems: "center", opacity: 0.5 }}>
            <Activity size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 12 }}>Nenhuma corrida registrada ainda.</Text>
          </View>
        ) : (
          runs.map((run) => (
            <View key={run.id} style={[styles.runCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Activity size={20} color={colors.brandPrimary} />
                  <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.onSurface }}>
                    Corrida Livre
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.muted }}>{run.date}</Text>
              </View>
              
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ alignItems: "center" }}>
                  <MapPin size={18} color={colors.muted} />
                  <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.onSurface, marginTop: 4 }}>{run.distance_km} km</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Distância</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Clock size={18} color={colors.muted} />
                  <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.onSurface, marginTop: 4 }}>{run.duration_min} min</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Duração</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Flame size={18} color={colors.muted} />
                  <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.onSurface, marginTop: 4 }}>
                    {(run.pace_min_km || 0).toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Pace (min/km)</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Pressable
          onPress={handleAddMockRun}
          style={[styles.addBtn, { backgroundColor: colors.brandPrimary }]}
        >
          <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 16 }}>
            + Registrar Corrida (Teste)
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  runCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  addBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  }
});
