import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  Linking,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  Search,
  UserPlus,
  MessageSquare,
  ChevronRight,
  Activity,
  Dumbbell,
  Calendar,
  X,
} from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";
import { FilterChipRow, ChipOption } from "@/src/components/FilterChipRow";
import { Student } from "@/src/types";

const FILTER_OPTIONS: ChipOption[] = [
  { id: "todos", label: "Todos" },
  { id: "ativo", label: "Ativos" },
  { id: "proximo_vencimento", label: "Próx. Vencimento" },
  { id: "inadimplente", label: "Inadimplentes" },
  { id: "inativo", label: "Inativos" },
];

export default function StudentsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("todos");

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ["students-full-list", searchQuery, selectedStatus],
    queryFn: () => api.getStudents({ search: searchQuery, status: selectedStatus }),
  });

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(`Olá ${name}, tudo bem? Como estão os treinos?`)}`;
    Linking.openURL(url).catch(() => {});
  };

  const getStatusBadge = (status: Student["status"]) => {
    switch (status) {
      case "ativo":
        return { label: "Ativo", bg: "rgba(16, 185, 129, 0.15)", text: colors.success };
      case "proximo_vencimento":
        return { label: "Vence em breve", bg: "rgba(245, 158, 11, 0.15)", text: colors.warning };
      case "inadimplente":
        return { label: "Inadimplente", bg: "rgba(239, 68, 68, 0.15)", text: colors.error };
      case "inativo":
        return { label: "Inativo", bg: "rgba(107, 114, 128, 0.15)", text: colors.muted };
      default:
        return { label: status, bg: "rgba(107, 114, 128, 0.15)", text: colors.muted };
    }
  };

  const renderStudentCard = ({ item }: { item: Student }) => {
    const badge = getStatusBadge(item.status);

    return (
      <Pressable
        testID={`student-card-${item.id}`}
        onPress={() => router.push(`/students/${item.id}`)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surfaceSecondary,
          padding: 16,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1 }}>
          <Image
            source={{ uri: item.photo_url || "https://images.unsplash.com/photo-1637651684506-07e16fcf7b06?w=200" }}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surfaceTertiary }}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.onSurface }} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={{ backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: badge.text }}>{badge.label}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
              {item.goal || "Condicionamento Geral"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Dumbbell size={12} color={colors.muted} />
                <Text style={{ fontSize: 10, fontWeight: "500", color: colors.muted }}>
                  {item.frequency || 3}x/semana
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Calendar size={12} color={colors.muted} />
                <Text style={{ fontSize: 10, fontWeight: "500", color: colors.muted }}>
                  Vencimento {new Date(item.payment_due_date || Date.now()).toLocaleDateString("pt-BR")}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <ChevronRight size={20} color={colors.muted} />
      </Pressable>
    );
  };

  return (
    <View testID="students-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title="Alunos"
        subtitle={`${students.length} cadastrados no sistema`}
        testID="students-header"
        rightElement={
          <Pressable
            testID="btn-new-student-header"
            onPress={() => router.push("/students/new")}
            style={[styles.addHeaderBtn, { backgroundColor: colors.brandPrimary }]}
          >
            <UserPlus size={16} color={colors.onBrandPrimary} />
            <Text style={[styles.addHeaderText, { color: colors.onBrandPrimary }]}>Cadastrar</Text>
          </Pressable>
        }
      />

      {/* SEARCH BAR (Sticky with header) */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Search size={18} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            testID="students-search-input"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Pesquisar por nome, WhatsApp ou objetivo..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.onSurface }]}
          />
          {searchQuery.length > 0 && (
            <Pressable
              testID="clear-search-btn"
              onPress={() => setSearchQuery("")}
              style={styles.clearSearchBtn}
            >
              <X size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* P0 FILTER CHIP ROW */}
      <FilterChipRow
        options={FILTER_OPTIONS}
        selectedId={selectedStatus}
        onSelect={setSelectedStatus}
        testIDPrefix="student-filter"
      />

      {/* STUDENTS LIST */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={renderStudentCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={colors.brandPrimary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>
              Nenhum aluno encontrado
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.onSurfaceSecondary }]}>
              Tente alterar os termos de pesquisa ou filtros selecionados.
            </Text>
            <Pressable
              testID="btn-empty-create-student"
              onPress={() => router.push("/students/new")}
              style={[styles.emptyCreateBtn, { backgroundColor: colors.brandPrimary }]}
            >
              <UserPlus size={16} color="#FFF" />
              <Text style={styles.emptyCreateText}>Cadastrar Novo Aluno</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
  },
  addHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  addHeaderText: {
    fontSize: 12,
    fontWeight: "700",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: "100%",
  },
  clearSearchBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 12,
    marginBottom: 4,
  },
  goalBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  metricsStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  metricCol: {
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  viewProfileBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  emptyCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  emptyCreateText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
}));
