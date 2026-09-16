import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Target, Trophy, Medal, Star } from "lucide-react-native";

import { useTheme } from "@/src/theme";
import { api } from "@/src/api/client";

export default function StudentGoalsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface }}>
          Desafios & Metas
        </Text>
        <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
          Gamificação e troféus conquistados
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, gap: 16 }}>
        
        {/* Nível do Aluno */}
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, alignItems: "center" }]}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Trophy size={40} color={colors.brandPrimary} />
          </View>
          <Text style={{ fontSize: 14, color: colors.muted, textTransform: "uppercase", letterSpacing: 1 }}>Nível Atual</Text>
          <Text style={{ fontSize: 28, fontWeight: "900", color: colors.onSurface, marginTop: 4 }}>Atleta Amador</Text>
          
          <View style={{ width: "100%", height: 8, backgroundColor: colors.surfaceTertiary, borderRadius: 4, marginTop: 16, overflow: "hidden" }}>
            <View style={{ width: "75%", height: "100%", backgroundColor: colors.brandPrimary }} />
          </View>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 8 }}>Faltam 250 XP para o nível "Maratonista"</Text>
        </View>

        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.onSurface, marginTop: 8 }}>
          Metas da Semana
        </Text>

        {/* Metas da semana */}
        <View style={[styles.goalCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
            <Star size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: colors.onSurface }}>Beber 3L de Água</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>5 de 7 dias concluídos</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.success }}>+50 XP</Text>
        </View>

        <View style={[styles.goalCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
            <Medal size={20} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: colors.onSurface }}>Não furar a Dieta</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>0 deslizes na semana</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.warning }}>+100 XP</Text>
        </View>

        <View style={[styles.goalCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
            <Target size={20} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "bold", color: colors.onSurface }}>Correr 15km</Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>12.5 / 15 km atingidos</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.info }}>+150 XP</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  }
});
