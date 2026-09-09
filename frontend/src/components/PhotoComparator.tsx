import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { Camera, ArrowLeftRight, Calendar } from "lucide-react-native";
import { useTheme } from "../theme";
import { resolveImageUrl } from "../api/client";
import { PhysicalAssessment } from "../types";

interface PhotoComparatorProps {
  assessments: PhysicalAssessment[];
  testID?: string;
}

type Angle = "front" | "side" | "back";

export const PhotoComparator: React.FC<PhotoComparatorProps> = ({
  assessments,
  testID = "photo-comparator",
}) => {
  const { colors } = useTheme();
  const [selectedAngle, setSelectedAngle] = useState<Angle>("front");

  // Default to first assessment (baseline) and last assessment (current)
  const [beforeIdx, setBeforeIdx] = useState<number>(
    assessments.length > 1 ? assessments.length - 1 : 0
  );
  const [afterIdx, setAfterIdx] = useState<number>(0);

  if (!assessments || assessments.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
        <Camera size={32} color={colors.muted} />
        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Nenhuma foto de evolução</Text>
        <Text style={[styles.emptySubtitle, { color: colors.onSurfaceSecondary }]}>
          Adicione fotos frontal, lateral e posterior durante as avaliações físicas.
        </Text>
      </View>
    );
  }

  const beforeEval = assessments[beforeIdx] || assessments[0];
  const afterEval = assessments[afterIdx] || assessments[0];

  const getPhotoUrl = (evalItem: PhysicalAssessment, angle: Angle) => {
    const ref = evalItem.photos && evalItem.photos[angle];
    return resolveImageUrl(ref) || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400";
  };

  const beforePhoto = getPhotoUrl(beforeEval, selectedAngle);
  const afterPhoto = getPhotoUrl(afterEval, selectedAngle);

  // Compute metrics deltas
  const weightDiff = (afterEval.weight_kg - beforeEval.weight_kg).toFixed(1);
  const fatDiff = (afterEval.body_fat_pct - beforeEval.body_fat_pct).toFixed(1);
  const waistDiff = (
    (afterEval.circumferences?.cintura || 0) - (beforeEval.circumferences?.cintura || 0)
  ).toFixed(1);

  return (
    <View testID={testID} style={[styles.container, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      {/* Angle Selector Pills */}
      <View style={styles.angleSelector}>
        <Pressable
          testID={`${testID}-angle-front`}
          onPress={() => setSelectedAngle("front")}
          style={[
            styles.angleButton,
            {
              backgroundColor: selectedAngle === "front" ? colors.brandPrimary : colors.surfaceTertiary,
              borderColor: selectedAngle === "front" ? colors.brandPrimary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.angleText,
              { color: selectedAngle === "front" ? colors.onBrandPrimary : colors.onSurfaceSecondary },
            ]}
          >
            Frente
          </Text>
        </Pressable>

        <Pressable
          testID={`${testID}-angle-side`}
          onPress={() => setSelectedAngle("side")}
          style={[
            styles.angleButton,
            {
              backgroundColor: selectedAngle === "side" ? colors.brandPrimary : colors.surfaceTertiary,
              borderColor: selectedAngle === "side" ? colors.brandPrimary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.angleText,
              { color: selectedAngle === "side" ? colors.onBrandPrimary : colors.onSurfaceSecondary },
            ]}
          >
            Lateral
          </Text>
        </Pressable>

        <Pressable
          testID={`${testID}-angle-back`}
          onPress={() => setSelectedAngle("back")}
          style={[
            styles.angleButton,
            {
              backgroundColor: selectedAngle === "back" ? colors.brandPrimary : colors.surfaceTertiary,
              borderColor: selectedAngle === "back" ? colors.brandPrimary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.angleText,
              { color: selectedAngle === "back" ? colors.onBrandPrimary : colors.onSurfaceSecondary },
            ]}
          >
            Costas
          </Text>
        </Pressable>
      </View>

      {/* Side-by-Side Frames */}
      <View style={styles.framesContainer}>
        {/* BEFORE FRAME */}
        <View style={[styles.photoFrame, { borderColor: colors.border, backgroundColor: colors.surfaceTertiary }]}>
          <View style={[styles.frameBadge, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
            <Text style={styles.frameBadgeText}>ANTES</Text>
          </View>
          <Image
            source={{ uri: beforePhoto }}
            style={styles.photo}
            contentFit="cover"
            transition={300}
          />
          <View style={[styles.frameFooter, { backgroundColor: colors.surface }]}>
            <Calendar size={12} color={colors.onSurfaceSecondary} />
            <Text style={[styles.frameDate, { color: colors.onSurfaceSecondary }]}>
              {beforeEval.date}
            </Text>
            <Text style={[styles.frameStats, { color: colors.onSurface }]}>
              {beforeEval.weight_kg}kg • {beforeEval.body_fat_pct}%
            </Text>
          </View>
        </View>

        {/* COMPARISON ICON */}
        <View style={[styles.compareBadge, { backgroundColor: colors.brandPrimary }]}>
          <ArrowLeftRight size={16} color={colors.onBrandPrimary} />
        </View>

        {/* AFTER FRAME */}
        <View style={[styles.photoFrame, { borderColor: colors.brandPrimary, backgroundColor: colors.surfaceTertiary }]}>
          <View style={[styles.frameBadge, { backgroundColor: colors.brandPrimary }]}>
            <Text style={styles.frameBadgeText}>DEPOIS</Text>
          </View>
          <Image
            source={{ uri: afterPhoto }}
            style={styles.photo}
            contentFit="cover"
            transition={300}
          />
          <View style={[styles.frameFooter, { backgroundColor: colors.surface }]}>
            <Calendar size={12} color={colors.brandPrimary} />
            <Text style={[styles.frameDate, { color: colors.brandPrimary, fontWeight: "700" }]}>
              {afterEval.date}
            </Text>
            <Text style={[styles.frameStats, { color: colors.onSurface }]}>
              {afterEval.weight_kg}kg • {afterEval.body_fat_pct}%
            </Text>
          </View>
        </View>
      </View>

      {/* DELTA SUMMARY BAR */}
      <View style={[styles.deltaBar, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
        <View style={styles.deltaItem}>
          <Text style={[styles.deltaLabel, { color: colors.onSurfaceSecondary }]}>Peso</Text>
          <Text style={[styles.deltaValue, { color: Number(weightDiff) <= 0 ? colors.success : colors.warning }]}>
            {Number(weightDiff) > 0 ? `+${weightDiff}` : weightDiff} kg
          </Text>
        </View>

        <View style={styles.deltaItem}>
          <Text style={[styles.deltaLabel, { color: colors.onSurfaceSecondary }]}>% Gordura</Text>
          <Text style={[styles.deltaValue, { color: Number(fatDiff) <= 0 ? colors.success : colors.error }]}>
            {Number(fatDiff) > 0 ? `+${fatDiff}` : fatDiff}%
          </Text>
        </View>

        <View style={styles.deltaItem}>
          <Text style={[styles.deltaLabel, { color: colors.onSurfaceSecondary }]}>Cintura</Text>
          <Text style={[styles.deltaValue, { color: Number(waistDiff) <= 0 ? colors.success : colors.error }]}>
            {Number(waistDiff) > 0 ? `+${waistDiff}` : waistDiff} cm
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  angleSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  angleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  angleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  framesContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    position: "relative",
  },
  photoFrame: {
    flex: 1,
    height: 240,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: 185,
  },
  frameBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    zIndex: 2,
  },
  frameBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  frameFooter: {
    height: 55,
    padding: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  frameDate: {
    fontSize: 11,
    marginTop: 2,
  },
  frameStats: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  compareBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    position: "absolute",
    left: "50%",
    marginLeft: -16,
    top: 90,
  },
  deltaBar: {
    flexDirection: "row",
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "space-around",
  },
  deltaItem: {
    alignItems: "center",
  },
  deltaLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  deltaValue: {
    fontSize: 13,
    fontWeight: "800",
  },
});
