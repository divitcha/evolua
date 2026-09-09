import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Linking, Platform } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, X, RefreshCw } from "lucide-react-native";

import { useTheme, makeStyles } from "@/src/theme";
import { api, resolveImageUrl } from "@/src/api/client";

interface PhotoUploadFieldProps {
  label: string;
  value?: string | null; // stored path/url
  onChange: (path: string | null) => void;
  testID?: string;
}

export const PhotoUploadField: React.FC<PhotoUploadFieldProps> = ({
  label,
  value,
  onChange,
  testID = "photo-upload",
}) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const [uploading, setUploading] = useState(false);
  const [showChoice, setShowChoice] = useState(false);
  const [blocked, setBlocked] = useState<"camera" | "gallery" | null>(null);

  const displayUrl = resolveImageUrl(value);

  const uploadUri = async (uri: string) => {
    setUploading(true);
    try {
      const res = await api.uploadImage(uri);
      onChange(res.url);
    } catch (e) {
      onChange(null);
    } finally {
      setUploading(false);
    }
  };

  const pickFromGallery = async () => {
    setShowChoice(false);
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let status = perm.status;
    if (status !== "granted") {
      if (perm.canAskAgain) {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        setBlocked("gallery");
        return;
      }
    }
    setBlocked(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    setShowChoice(false);
    const perm = await ImagePicker.getCameraPermissionsAsync();
    let status = perm.status;
    if (status !== "granted") {
      if (perm.canAskAgain) {
        const req = await ImagePicker.requestCameraPermissionsAsync();
        status = req.status;
      }
      if (status !== "granted") {
        setBlocked("camera");
        return;
      }
    }
    setBlocked(null);
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadUri(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={[styles.label, { color: colors.onSurface }]}>{label}</Text>

      {displayUrl ? (
        <View style={[styles.preview, { borderColor: colors.border }]}>
          <Image source={{ uri: displayUrl }} style={styles.previewImg} contentFit="cover" transition={200} />
          <Pressable
            testID={`${testID}-remove`}
            onPress={() => onChange(null)}
            style={[styles.removeBtn, { backgroundColor: colors.error }]}
          >
            <X size={14} color="#FFFFFF" />
          </Pressable>
          <Pressable
            testID={`${testID}-replace`}
            onPress={() => setShowChoice(true)}
            style={[styles.replaceBtn, { backgroundColor: "rgba(0,0,0,0.6)" }]}
          >
            <RefreshCw size={13} color="#FFFFFF" />
            <Text style={styles.replaceText}>Trocar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          testID={`${testID}-add`}
          onPress={() => setShowChoice(true)}
          disabled={uploading}
          style={[styles.dropzone, { borderColor: colors.border, backgroundColor: colors.surfaceTertiary }]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : (
            <>
              <ImagePlus size={22} color={colors.brandPrimary} />
              <Text style={[styles.dropText, { color: colors.onSurfaceSecondary }]}>Adicionar foto</Text>
            </>
          )}
        </Pressable>
      )}

      {/* CHOICE ROW */}
      {showChoice && (
        <View style={[styles.choiceRow, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
          <Pressable testID={`${testID}-camera`} onPress={takePhoto} style={styles.choiceBtn}>
            <Camera size={18} color={colors.brandPrimary} />
            <Text style={[styles.choiceText, { color: colors.onSurface }]}>Câmera</Text>
          </Pressable>
          <View style={[styles.choiceDivider, { backgroundColor: colors.border }]} />
          <Pressable testID={`${testID}-gallery`} onPress={pickFromGallery} style={styles.choiceBtn}>
            <ImagePlus size={18} color={colors.brandPrimary} />
            <Text style={[styles.choiceText, { color: colors.onSurface }]}>Galeria</Text>
          </Pressable>
        </View>
      )}

      {blocked && (
        <View style={styles.blockedBox}>
          <Text style={[styles.blockedText, { color: colors.onSurfaceSecondary }]}>
            {blocked === "camera"
              ? "Permita o acesso à câmera nas configurações."
              : "Permita o acesso às fotos nas configurações."}
          </Text>
          <Pressable
            testID={`${testID}-open-settings`}
            onPress={() => Linking.openSettings()}
            style={[styles.settingsBtn, { borderColor: colors.brandPrimary }]}
          >
            <Text style={[styles.settingsText, { color: colors.brandPrimary }]}>Abrir Configurações</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  wrap: { flex: 1 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  preview: {
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  previewImg: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  replaceBtn: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  replaceText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  dropzone: {
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dropText: { fontSize: 12, fontWeight: "600" },
  choiceRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    overflow: "hidden",
  },
  choiceBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  choiceDivider: { width: 1 },
  choiceText: { fontSize: 13, fontWeight: "700" },
  blockedBox: { marginTop: 8, alignItems: "flex-start", gap: 6 },
  blockedText: { fontSize: 12 },
  settingsBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  settingsText: { fontSize: 12, fontWeight: "700" },
}));
