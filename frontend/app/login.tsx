import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Dumbbell, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme, makeStyles } from "@/src/theme";
import { useAuth } from "@/src/auth/AuthContext";

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      setError("Preencha todos os campos para continuar.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email.trim().toLowerCase(), password);
      } else {
        await signUp(name.trim(), email.trim().toLowerCase(), password);
      }
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("401")) setError("E-mail ou senha incorretos.");
      else if (msg.includes("409")) setError("Este e-mail já está cadastrado.");
      else setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View testID="login-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* BRAND */}
        <View style={styles.brandArea}>
          <LinearGradient
            colors={[colors.brandPrimary, colors.brandSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBox}
          >
            <Dumbbell size={30} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.brandTitle, { color: colors.onSurface }]}>Treinaí</Text>
          <Text style={[styles.brandSubtitle, { color: colors.onSurfaceSecondary }]}>
            O seu app de acompanhamento fitness
          </Text>
        </View>

        {/* CARD */}
        <View style={[styles.card, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
            {mode === "login" ? "Bem-vindo de volta" : "Criar conta"}
          </Text>
          <Text style={[styles.cardCaption, { color: colors.onSurfaceSecondary }]}>
            {mode === "login"
              ? "Escolha seu perfil e acesse sua conta."
              : "Crie sua conta de treinador grátis."}
          </Text>

          {mode === "register" && (
            <View style={styles.field}>
              <User size={18} color={colors.muted} />
              <TextInput
                testID="input-name"
                value={name}
                onChangeText={setName}
                placeholder="Seu Nome"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
                style={[styles.input, { color: colors.onSurface }]}
              />
            </View>
          )}

          <View style={styles.field}>
            <Mail size={18} color={colors.muted} />
            <TextInput
              testID="input-email"
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              style={[styles.input, { color: colors.onSurface }]}
            />
          </View>

          <View style={styles.field}>
            <Lock size={18} color={colors.muted} />
            <TextInput
              testID="input-password"
              value={password}
              onChangeText={setPassword}
              placeholder="Senha"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={[styles.input, { color: colors.onSurface }]}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
              {showPassword ? (
                <EyeOff size={18} color={colors.muted} />
              ) : (
                <Eye size={18} color={colors.muted} />
              )}
            </Pressable>
          </View>

          {!!error && (
            <Text testID="login-error" style={[styles.error, { color: colors.error }]}>
              {error}
            </Text>
          )}

          <Pressable
            testID="btn-submit-auth"
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: colors.brandPrimary, opacity: loading ? 0.7 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitText}>
                  {mode === "login" ? "Entrar" : "Criar conta"}
                </Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          <Pressable
            testID="btn-toggle-mode"
            onPress={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
            style={styles.toggleBtn}
          >
            <Text style={[styles.toggleText, { color: colors.onSurfaceSecondary }]}>
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>
                {mode === "login" ? "Cadastre-se" : "Faça login"}
              </Text>
            </Text>
          </Pressable>
        </View>

        {mode === "login" && (
          <View style={[styles.demoHint, { borderColor: colors.border }]}>
            <Text style={[styles.demoText, { color: colors.muted }]}>
              Demo: admin@treinai.com · treino123
            </Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, flexGrow: 1, justifyContent: "center" },
  brandArea: { alignItems: "center", marginBottom: 28 },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  brandTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  brandSubtitle: { fontSize: 13, marginTop: 4, textAlign: "center" },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  cardTitle: { fontSize: 20, fontWeight: "800" },
  cardCaption: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 15, height: "100%" },
  error: { fontSize: 13, marginBottom: 10, fontWeight: "600" },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  toggleBtn: { alignItems: "center", marginTop: 16 },
  toggleText: { fontSize: 13 },
  roleToggle: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  roleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: {
    fontWeight: "700",
    fontSize: 13,
  },
  demoHint: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 10,
    borderStyle: "dashed",
    paddingVertical: 10,
    alignItems: "center",
  },
  demoText: { fontSize: 12 },
}));
