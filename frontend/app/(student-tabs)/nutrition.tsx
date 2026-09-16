import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth/AuthContext";
import { useTheme } from "@/src/theme";
import { api } from "@/src/api/client";
import { Coffee, Utensils, Moon } from "lucide-react-native";

export default function StudentNutritionScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = async () => {
    try {
      const res = await api.getMeals();
      setMeals(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { role } = useAuth();

  useEffect(() => {
    if (role === "student") {
      fetchMeals();
    }
  }, [role]);

  const handleAddMockMeal = async () => {
    try {
      await api.logMeal({
        meal_type: "Almoço",
        food_name: "Frango com Batata Doce",
        calories: 350,
        protein_g: 40,
        carbs_g: 30,
        fat_g: 5
      });
      fetchMeals();
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
        {meals.length === 0 ? (
          <View style={{ padding: 30, alignItems: "center", opacity: 0.5 }}>
            <Utensils size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 12 }}>Nenhuma refeição registrada hoje.</Text>
          </View>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={[styles.mealCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.iconBox, { backgroundColor: colors.surfaceTertiary }]}>
                  {meal.meal_type === "Café da Manhã" ? <Coffee size={20} color={colors.brandPrimary} /> : 
                   meal.meal_type === "Jantar" ? <Moon size={20} color={colors.brandPrimary} /> :
                   <Utensils size={20} color={colors.brandPrimary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "bold", fontSize: 15, color: colors.onSurface }}>{meal.meal_type}</Text>
                  <Text style={{ fontSize: 13, color: colors.muted }}>{meal.food_name}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "bold", fontSize: 15, color: colors.onSurface }}>{meal.calories} kcal</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>{meal.protein_g}g P • {meal.carbs_g}g C</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <Pressable
          onPress={handleAddMockMeal}
          style={[styles.addBtn, { backgroundColor: colors.brandPrimary }]}
        >
          <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 16 }}>
            + Registrar Refeição (Teste)
          </Text>
        </Pressable>
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
