import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash, LogOut } from "lucide-react-native";
import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";
import { useAuth } from "@/src/auth/AuthContext";

export default function AdminTrainers() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  const { data: trainers, isLoading } = useQuery({
    queryKey: ["admin-trainers"],
    queryFn: api.getTrainers,
  });

  const createMut = useMutation({
    mutationFn: (data: any) => api.createTrainer(data.name, data.email, data.password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-trainers"] }),
    onError: (e: any) => Alert.alert("Erro", e.message),
  });

  const deleteMut = useMutation({
    mutationFn: api.deleteTrainer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-trainers"] }),
  });

  const handleCreate = () => {
    if (Platform.OS === "web") {
      const name = window.prompt("Nome do Personal:");
      if (!name) return;
      const email = window.prompt("E-mail:");
      if (!email) return;
      const password = window.prompt("Senha:");
      if (!password) return;
      createMut.mutate({ name, email, password });
    } else {
      Alert.alert("Aviso", "Criação pelo app mobile em breve");
    }
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Deseja mesmo remover este Personal?")) {
        deleteMut.mutate(id);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title="Gestão de Personais"
        rightContent={
          <Pressable onPress={signOut}>
            <LogOut size={24} color={colors.onSurface} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={handleCreate} style={[styles.addButton, { backgroundColor: colors.brandPrimary }]}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Adicionar Personal</Text>
        </Pressable>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.brandPrimary} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ gap: 12, marginTop: 16 }}>
            {trainers?.map((t: any) => (
              <View key={t.id} style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.name, { color: colors.onSurface }]}>{t.name}</Text>
                  <Text style={[styles.email, { color: colors.muted }]}>{t.email}</Text>
                </View>
                <Pressable onPress={() => handleDelete(t.id)}>
                  <Trash size={20} color={colors.error} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1 },
  scroll: { padding: 16 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  name: { fontSize: 16, fontWeight: "bold" },
  email: { fontSize: 14, marginTop: 4 },
}));
