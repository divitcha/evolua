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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, User } from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api } from "@/src/api/client";
import { Header } from "@/src/components/Header";

export default function StudentChatScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const { data: student } = useQuery({
    queryKey: ["student-detail", id],
    queryFn: () => api.getStudent(id as string),
    enabled: !!id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["student-messages", id],
    queryFn: () => api.getMessages(id as string),
    enabled: !!id,
  });

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api.sendMessage(id as string, input.trim(), "personal");
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["student-messages", id] });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <View testID="student-chat-screen" style={[styles.container, { backgroundColor: colors.surface }]}>
      <Header
        title={`Chat com ${student?.name || "Aluno"}`}
        subtitle="Comunicação Direta Personal-Aluno"
        showBack
        testID="student-chat-header"
      />

      <ScrollView
        contentContainerStyle={[
          styles.chatContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
      >
        {messages.map((msg) => {
          const isPersonal = msg.sender === "personal";
          return (
            <View
              key={msg.id}
              style={[
                styles.bubbleWrapper,
                isPersonal ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
              ]}
            >
              <Text style={[styles.senderLabel, { color: colors.muted }]}>
                {isPersonal ? "Você" : student?.name || "Aluno"} • {msg.timestamp.substring(11, 16) || "Hoje"}
              </Text>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isPersonal ? colors.brandPrimary : colors.surfaceSecondary,
                    borderColor: isPersonal ? colors.brandPrimary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    { color: isPersonal ? "#FFFFFF" : colors.onSurface },
                  ]}
                >
                  {msg.text}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* STICKY INPUT BAR */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12) + 10,
          },
        ]}
      >
        <TextInput
          testID="student-chat-input"
          value={input}
          onChangeText={setInput}
          placeholder="Digite sua mensagem para o aluno..."
          placeholderTextColor={colors.muted}
          style={[
            styles.textInput,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              color: colors.onSurface,
            },
          ]}
        />
        <Pressable
          testID="student-chat-send"
          onPress={handleSend}
          disabled={sending || !input.trim()}
          style={[
            styles.sendButton,
            {
              backgroundColor: input.trim() ? colors.brandPrimary : colors.surfaceTertiary,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Send size={18} color={input.trim() ? "#FFFFFF" : colors.muted} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bubbleWrapper: {
    marginBottom: 12,
    maxWidth: "85%",
  },
  bubbleWrapperLeft: {
    alignSelf: "flex-start",
  },
  bubbleWrapperRight: {
    alignSelf: "flex-end",
  },
  senderLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  bubble: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
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
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
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
