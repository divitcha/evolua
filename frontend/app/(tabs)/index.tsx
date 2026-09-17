import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet, Linking, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { Users, User, Bell, Menu, ChevronRight, ClipboardList, DollarSign, Activity, Flame } from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { Student } from "@/src/types";

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, role, signOut } = useAuth();

  const [notifying, setNotifying] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  const handleNotifyAlerts = async () => {
    if (notifying) return;
    setNotifying(true);
    try {
      const res = await api.notifyAlerts();
      setNotifyMsg(res.message);
      setTimeout(() => setNotifyMsg(null), 4000);
    } catch {
      setNotifyMsg("Notificações disponíveis após publicar o app.");
      setTimeout(() => setNotifyMsg(null), 4000);
    } finally {
      setNotifying(false);
    }
  };

  const { data: dashboard, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.getDashboard(),
    enabled: role === "trainer",
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    queryFn: () => api.getStudents(),
    enabled: role === "trainer",
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["students-list"] })]);
    setRefreshing(false);
  };

  return (
    <View testID="dashboard-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Cabeçalho */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingBottom: 24, paddingTop: Math.max(insets.top, 24), backgroundColor: colors.surfaceSecondary }}>
        <Menu size={24} color={colors.onSurfaceSecondary} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable onPress={handleNotifyAlerts}>
            <Bell size={24} color={colors.muted} />
          </Pressable>
          <Pressable 
            onPress={() => {
              if (Platform.OS === "web") {
                if (window.confirm("Deseja sair do sistema?")) signOut();
              } else {
                Alert.alert("Sair", "Deseja sair do sistema?", [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Sair", style: "destructive", onPress: signOut }
                ]);
              }
            }} 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}
          >
             <Image source="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" style={{ width: "100%", height: "100%" }} />
          </Pressable>
        </View>
      </View>

      {notifyMsg && (
        <View style={[styles.notifyBanner, { backgroundColor: colors.brandTertiary, borderColor: colors.brandPrimary }]}>
          <Bell size={13} color={colors.brandPrimary} />
          <Text testID="notify-banner-text" style={[styles.notifyBannerText, { color: colors.brandPrimary }]} numberOfLines={1}>
            {notifyMsg}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            tintColor={colors.brandPrimary}
          />
        }
      >
        {/* Saudação */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 24, backgroundColor: colors.surfaceSecondary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface }}>Olá, {user?.name?.split(" ")[0] || "Professor"}!</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>Aqui está o resumo do seu dia.</Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Card Principal - Alunos Ativos */}
          <LinearGradient
            colors={["#059669", "#10B981"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 24, marginBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center", overflow: "hidden" }}
          >
            <View style={{ zIndex: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Users size={24} color="#A7F3D0" />
                <Text style={{ fontSize: 48, fontWeight: "800", color: "#FFFFFF", letterSpacing: -1 }}>
                  {dashboard?.active_students || 0}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "500", color: "#D1FAE5" }}>alunos ativos</Text>
            </View>
            <View style={{ width: 96, height: 64, opacity: 0.8, zIndex: 10 }}>
              <Svg viewBox="0 0 100 50" width="100%" height="100%">
                <Path d="M0,40 L20,35 L40,45 L60,20 L80,25 L100,5" stroke="#FFFFFF" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={{ position: "absolute", right: -24, top: -24, width: 128, height: 128, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 64 }} />
          </LinearGradient>

          {/* Grade de Métricas Menores */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            <Pressable onPress={() => router.push("/students/new")} style={{ flex: 1, backgroundColor: colors.surfaceSecondary, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(16, 185, 129, 0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <User size={20} color="#059669" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface }}>{dashboard?.new_students_this_month || 0}</Text>
              <Text style={{ fontSize: 11, fontWeight: "500", color: colors.muted, marginTop: 4, textAlign: "center" }}>novos</Text>
            </Pressable>
            
            <Pressable onPress={() => router.push("/(tabs)/assessments")} style={{ flex: 1, backgroundColor: colors.surfaceSecondary, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245, 158, 11, 0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Activity size={20} color="#D97706" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface }}>{dashboard?.pending_assessments || 0}</Text>
              <Text style={{ fontSize: 11, fontWeight: "500", color: colors.muted, marginTop: 4, textAlign: "center", lineHeight: 12 }}>avaliações</Text>
            </Pressable>
            
            <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(239, 68, 68, 0.1)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <Text style={{ color: "#EF4444", fontWeight: "bold", fontSize: 18 }}>$</Text>
              </View>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface }}>{dashboard?.overdue_payments || 0}</Text>
              <Text style={{ fontSize: 11, fontWeight: "500", color: colors.muted, marginTop: 4, textAlign: "center", lineHeight: 12 }}>pagamentos</Text>
            </View>
          </View>

          {/* Gráfico de Frequência Circular */}
          <View style={{ backgroundColor: colors.surfaceSecondary, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: colors.border, marginBottom: 24 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.onSurface, marginBottom: 16 }}>Frequência</Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ width: 96, height: 96 }}>
                <Svg viewBox="0 0 36 36" width="100%" height="100%" style={{ transform: [{ rotate: "-90deg" }] }}>
                  <Path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={colors.surfaceTertiary} strokeWidth="4" />
                  <Path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeDasharray="78, 100" />
                </Svg>
                <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.onSurface }}>78%</Text>
                </View>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#059669" }} />
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>Presentes</Text>
                  </View>
                  <Text style={{ color: colors.onSurface, fontWeight: "bold", fontSize: 12 }}>78%</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#FBBF24" }} />
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>Ausentes</Text>
                  </View>
                  <Text style={{ color: colors.onSurface, fontWeight: "bold", fontSize: 12 }}>14%</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444" }} />
                    <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>Faltas</Text>
                  </View>
                  <Text style={{ color: colors.onSurface, fontWeight: "bold", fontSize: 12 }}>8%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Alerta de Inatividade */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.onSurface }}>Alertas importantes</Text>
              <Pressable onPress={() => router.push("/(tabs)/students")}>
                <Text style={{ fontSize: 12, fontWeight: "bold", color: "#059669" }}>Ver todos</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => router.push("/(tabs)/students")} style={{ backgroundColor: "#EF4444", borderRadius: 24, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                  <Flame size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 16 }}>{dashboard?.inactive_students_7d || 0} alunos sem treinar</Text>
                  <Text style={{ color: "#FEE2E2", fontSize: 12, fontWeight: "500", marginTop: 4 }}>Nos últimos 7 dias</Text>
                </View>
              </View>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
                <ChevronRight size={16} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
  },
  notifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  notifyBannerText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
}));
