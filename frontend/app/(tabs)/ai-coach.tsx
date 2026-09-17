import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, Send, Bot, User, Check, RefreshCw } from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";

interface ChatBubble {
  id: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Sugerir treino Hipertrofia ABC para aluno intermediário",
  "Analisar evolução: -5kg de gordura e +1.5kg massa magra",
  "Mensagem motivacional para aluno sem treinar há 10 dias",
  "Periodização ondulatória para aluna com foco em glúteos",
];

export default function AICoachScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatBubble[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Olá, Treinador! Sou seu assistente de IA especialista em Fisiologia, Biomecânica e Prescrição de Treinos. Como posso te ajudar hoje?",
      timestamp: "Agora",
    },
  ]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputPrompt.trim();
    if (!text || loading) return;

    const userMsg: ChatBubble = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: text,
      timestamp: "Agora",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setLoading(true);

    try {
      const response = await api.askAIAssistant(text);
      const aiMsg: ChatBubble = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: response.reply,
        timestamp: "Agora",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const fallbackMsg: ChatBubble = {
        id: `ai_fallback_${Date.now()}`,
        sender: "ai",
        text: `(Simulação Offline) Aqui está a resposta para: "${text}". \n\nPara o treino de Hipertrofia sugerido, vamos focar em:\n\n**A (Peito/Tríceps)**\n- Supino Reto: 4x8-10\n- Crucifixo Inclinado: 3x12\n- Tríceps Testa: 4x10\n\nLembre-se de manter a cadência 2020 e descanso de 60s!`,
        timestamp: "Agora",
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View testID="ai-coach-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* CUSTOM HEADER MODELO 2 */}
      <View style={{ paddingTop: Math.max(insets.top, 24), paddingHorizontal: 24, paddingBottom: 16, backgroundColor: colors.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.onSurface, marginBottom: 4 }}>Assistente IA do Personal</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>Copiloto de Fisiologia e Prescrição de Treinos</Text>
        </View>
      </View>

      {/* QUICK SUGGESTION CHIPS */}
      <View style={[styles.quickChipsRow, { backgroundColor: colors.surfaceSecondary, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsContent}>
          {QUICK_PROMPTS.map((prompt, idx) => (
            <Pressable
              key={idx}
              testID={`quick-prompt-${idx}`}
              onPress={() => handleSend(prompt)}
              style={[styles.quickChip, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}
            >
              <Sparkles size={12} color={colors.brandPrimary} style={{ marginRight: 5 }} />
              <Text style={[styles.quickChipText, { color: colors.onSurfaceSecondary }]} numberOfLines={1}>
                {prompt}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* MESSAGE STREAM */}
      <ScrollView
        contentContainerStyle={[
          styles.chatContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 100 },
        ]}
      >
        {messages.map((msg) => {
          const isAI = msg.sender === "ai";
          return (
            <View
              key={msg.id}
              testID={`chat-bubble-${msg.id}`}
              style={[
                styles.bubbleWrapper,
                isAI ? styles.bubbleWrapperLeft : styles.bubbleWrapperRight,
              ]}
            >
              <View style={styles.bubbleHeader}>
                {isAI ? (
                  <View style={[styles.avatarAI, { backgroundColor: colors.brandTertiary }]}>
                    <Bot size={14} color={colors.brandPrimary} />
                  </View>
                ) : (
                  <View style={[styles.avatarUser, { backgroundColor: colors.surfaceTertiary }]}>
                    <User size={14} color={colors.onSurface} />
                  </View>
                )}
                <Text style={[styles.senderName, { color: colors.muted }]}>
                  {isAI ? "Treinaí AI" : "Você"} • {msg.timestamp}
                </Text>
              </View>

              <View
                style={[
                  styles.bubbleBody,
                  {
                    backgroundColor: isAI ? colors.surfaceSecondary : colors.brandPrimary,
                    borderColor: isAI ? colors.border : colors.brandPrimary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    {
                      color: isAI ? colors.onSurface : colors.onBrandPrimary,
                    },
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={colors.brandPrimary} />
            <Text style={[styles.loadingText, { color: colors.onSurfaceSecondary }]}>
              Treinaí AI formulando resposta técnica...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* STICKY INPUT BAR */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12) + 50,
          },
        ]}
      >
        <TextInput
          testID="ai-prompt-input"
          value={inputPrompt}
          onChangeText={setInputPrompt}
          placeholder="Peça um treino, ajuste biomecânico ou análise de Pollock..."
          placeholderTextColor={colors.muted}
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              color: colors.onSurface,
            },
          ]}
          multiline
        />

        <Pressable
          testID="ai-send-button"
          onPress={() => handleSend()}
          disabled={loading || !inputPrompt.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor: inputPrompt.trim() ? colors.brandPrimary : colors.surfaceTertiary,
            },
          ]}
        >
          <Send size={18} color={inputPrompt.trim() ? "#FFFFFF" : colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
  },
  quickChipsRow: {
    height: 48,
    borderBottomWidth: 1,
    justifyContent: "center",
  },
  quickChipsContent: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bubbleWrapper: {
    marginBottom: 16,
    maxWidth: "92%",
  },
  bubbleWrapperLeft: {
    alignSelf: "flex-start",
  },
  bubbleWrapperRight: {
    alignSelf: "flex-end",
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  avatarAI: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUser: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  senderName: {
    fontSize: 11,
  },
  bubbleBody: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
}));
