import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Droplet, Flame, ArrowRight, User, Dumbbell, LogOut } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth/AuthContext";
import { api } from "@/src/api/client";

export default function StudentDashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await api.getStudentDashboard();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "student") {
      fetchDashboard();
    }
  }, [role]);

  const handleAddWater = async () => {
    try {
      await api.logWater(250);
      fetchDashboard();
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

  const { hydration, nutrition, metrics, workout } = data || {};

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingBottom: 100 }}>
      <LinearGradient
        colors={[colors.brandPrimary, colors.brandSecondary]}
        style={{
          paddingTop: insets.top + 20,
          paddingBottom: 40,
          paddingHorizontal: 24,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ color: "#FFF", fontSize: 16, opacity: 0.9 }}>Bem-vindo de volta,</Text>
            <Text style={{ color: "#FFF", fontSize: 28, fontWeight: "bold", marginTop: 4 }}>
              {user?.name?.split(" ")[0]}!
            </Text>
          </View>
          <Pressable onPress={() => signOut()} style={{ padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12 }}>
            <LogOut size={20} color="#FFF" />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 24, marginTop: -20, gap: 16 }}>
        
        {/* Metric Cards */}
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <User size={20} color={colors.info} />
            <Text style={[styles.cardVal, { color: colors.onSurface }]}>{metrics?.weight_kg || 0} kg</Text>
            <Text style={[styles.cardLbl, { color: colors.muted }]}>Meu Peso</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Droplet size={20} color={colors.info} />
            <Text style={[styles.cardVal, { color: colors.onSurface }]}>{metrics?.body_fat_pct || 0}%</Text>
            <Text style={[styles.cardLbl, { color: colors.muted }]}>Gordura</Text>
          </View>
        </View>

        {/* Hydration */}
        <View style={[styles.largeCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={[styles.title, { color: colors.onSurface }]}>Hidratação Diária</Text>
              <Text style={[styles.sub, { color: colors.muted }]}>
                {hydration?.consumed_ml}ml / {hydration?.goal_ml}ml
              </Text>
            </View>
            <Pressable
              onPress={handleAddWater}
              style={{ backgroundColor: colors.brandTertiary, padding: 12, borderRadius: 12 }}
            >
              <Droplet size={24} color={colors.brandPrimary} />
            </Pressable>
          </View>
          <View style={{ height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: 4, marginTop: 16, overflow: "hidden" }}>
            <View
              style={{
                width: `${Math.min(100, ((hydration?.consumed_ml || 0) / (hydration?.goal_ml || 1)) * 100)}%`,
                height: "100%",
                backgroundColor: colors.info,
              }}
            />
          </View>
        </View>

        {/* Nutrition Summary */}
        <Pressable 
          onPress={() => router.push("/(student-tabs)/nutrition")}
          style={[styles.largeCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Flame size={20} color={colors.brandPrimary} />
              <Text style={[styles.title, { color: colors.onSurface }]}>Calorias Ingeridas</Text>
            </View>
            <ArrowRight size={20} color={colors.muted} />
          </View>
          <Text style={{ fontSize: 32, fontWeight: "800", color: colors.onSurface }}>
            {nutrition?.calories} <Text style={{ fontSize: 16, color: colors.muted, fontWeight: "400" }}>/ {nutrition?.calories_goal} kcal</Text>
          </Text>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.onSurface }}>{nutrition?.protein_g}g</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Proteína</Text>
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.onSurface }}>{nutrition?.carbs_g}g</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Carbo</Text>
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.onSurface }}>{nutrition?.fat_g}g</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Gordura</Text>
            </View>
          </View>
        </Pressable>

        {/* Workout */}
        <Pressable
          onPress={() => router.push("/(student-tabs)/evolution")}
          style={[styles.largeCard, { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ color: "#FFF", fontSize: 14, opacity: 0.9 }}>Treino do Dia</Text>
              <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "bold", marginTop: 4 }}>
                {workout ? workout.title : "Nenhum treino montado"}
              </Text>
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: 12, borderRadius: 12 }}>
              <Dumbbell size={24} color="#FFF" />
            </View>
          </View>
        </Pressable>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  cardVal: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  cardLbl: {
    fontSize: 13,
    marginTop: 4,
  },
  largeCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sub: {
    fontSize: 13,
    marginTop: 4,
  },
});
