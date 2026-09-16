import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api/client";
import { Coffee, Utensils, Moon, Circle, CheckCircle2 } from "lucide-react-native";

export default function StudentNutritionScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [meals, setMeals] = useState<any[]>([]);
  const [dietPlan, setDietPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [mealsRes, dashRes] = await Promise.all([
        api.getMeals(),
        api.getStudentDashboard()
      ]);
      setMeals(mealsRes);
      setDietPlan(dashRes.diet_plan || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { role } = useAuth();

  useEffect(() => {
    if (role === "student") {
      fetchData();
    }
  }, [role]);

  const handleLogPlanMeal = async (planMeal: any) => {
    try {
      await api.logMeal({
        meal_type: planMeal.name,
        food_name: planMeal.description,
        calories: planMeal.calories,
        protein_g: planMeal.proteins || 0,
        carbs_g: planMeal.carbs || 0,
        fat_g: 0
      });
      fetchData();
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
          Dieta de Hoje
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
          Acompanhe suas refeições
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, gap: 12 }}>
        {dietPlan.length === 0 ? (
          <View style={{ padding: 30, alignItems: "center", opacity: 0.5 }}>
            <Utensils size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: "center" }}>
              Seu Personal Trainer ainda não enviou um plano alimentar para você.
            </Text>
          </View>
        ) : (
          dietPlan.map((planMeal) => {
            const isConsumed = meals.some(m => m.meal_type === planMeal.name);
            return (
              <View key={planMeal.id} style={[styles.mealCard, { backgroundColor: isConsumed ? "rgba(16, 185, 129, 0.05)" : colors.surfaceSecondary, borderColor: isConsumed ? colors.success : colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Pressable 
                    onPress={() => !isConsumed && handleLogPlanMeal(planMeal)}
                    style={[styles.iconBox, { backgroundColor: isConsumed ? "rgba(16, 185, 129, 0.2)" : colors.surfaceTertiary }]}
                  >
                    {isConsumed ? <CheckCircle2 size={24} color={colors.success} /> : <Circle size={24} color={colors.muted} />}
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.onSurface }}>{planMeal.name}</Text>
                    <Text style={{ fontSize: 13, color: colors.muted }}>{planMeal.description}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "bold", fontSize: 15, color: colors.onSurface }}>{planMeal.calories} kcal</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mealCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  }
});
