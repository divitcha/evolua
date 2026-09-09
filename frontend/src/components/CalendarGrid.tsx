import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react-native";
import { useTheme } from "../theme";
import { AttendanceSummary } from "../types";

interface CalendarGridProps {
  summary: AttendanceSummary;
  onSelectDate?: (date: string) => void;
  onQuickLog?: (date: string, status: "presente" | "falta") => void;
  testID?: string;
}

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  summary,
  onSelectDate,
  onQuickLog,
  testID = "calendar-grid",
}) => {
  const { colors } = useTheme();
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5); // June (0-indexed)
  const [selectedDay, setSelectedDay] = useState<string>("2026-06-18");

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar days
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    const formatted = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    daysArray.push({ day: d, dateStr: formatted });
  }

  const isAttended = (dateStr: string) => summary.attended_dates?.includes(dateStr);
  const isMissed = (dateStr: string) => summary.missed_dates?.includes(dateStr);

  return (
    <View testID={testID} style={[styles.container, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
      {/* Month Navigation */}
      <View style={styles.header}>
        <Pressable
          testID={`${testID}-prev-month`}
          onPress={prevMonth}
          style={[styles.navButton, { backgroundColor: colors.surfaceTertiary }]}
        >
          <ChevronLeft size={18} color={colors.onSurface} />
        </Pressable>

        <Text style={[styles.monthTitle, { color: colors.onSurface }]}>
          {MONTHS_PT[currentMonth]} {currentYear}
        </Text>

        <Pressable
          testID={`${testID}-next-month`}
          onPress={nextMonth}
          style={[styles.navButton, { backgroundColor: colors.surfaceTertiary }]}
        >
          <ChevronRight size={18} color={colors.onSurface} />
        </Pressable>
      </View>

      {/* Weekday Labels */}
      <View style={styles.weekdaysRow}>
        {DAYS_OF_WEEK.map((w, idx) => (
          <Text key={idx} style={[styles.weekdayText, { color: colors.muted }]}>
            {w}
          </Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.grid}>
        {daysArray.map((item, idx) => {
          if (!item) {
            return <View key={idx} style={styles.emptyDayCell} />;
          }

          const attended = isAttended(item.dateStr);
          const missed = isMissed(item.dateStr);
          const isSelected = selectedDay === item.dateStr;

          let dayBg = colors.surfaceTertiary;
          let textColor = colors.onSurface;
          let borderColor = isSelected ? colors.brandPrimary : colors.border;

          if (attended) {
            dayBg = colors.success;
            textColor = colors.onSuccess;
          } else if (missed) {
            dayBg = colors.error;
            textColor = colors.onError;
          }

          return (
            <Pressable
              key={idx}
              testID={`${testID}-day-${item.day}`}
              onPress={() => {
                setSelectedDay(item.dateStr);
                if (onSelectDate) onSelectDate(item.dateStr);
              }}
              style={[
                styles.dayCell,
                {
                  backgroundColor: dayBg,
                  borderColor: borderColor,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.dayText, { color: textColor, fontWeight: isSelected || attended ? "700" : "500" }]}>
                {item.day}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Legend & Stats */}
      <View style={[styles.legendRow, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.legendText, { color: colors.onSurfaceSecondary }]}>
            {summary.total_performed} Realizados
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={[styles.legendText, { color: colors.onSurfaceSecondary }]}>
            {summary.total_missed} Faltas
          </Text>
        </View>

        <View style={styles.legendItem}>
          <Clock size={12} color={colors.brandPrimary} style={{ marginRight: 4 }} />
          <Text style={[styles.legendText, { color: colors.onSurfaceSecondary }]}>
            Freq: {summary.monthly_frequency}%
          </Text>
        </View>
      </View>

      {/* Quick Attendance Logger for selected day */}
      {selectedDay && (
        <View style={[styles.quickActionBar, { backgroundColor: colors.surfaceTertiary, borderColor: colors.border }]}>
          <Text style={[styles.selectedDayLabel, { color: colors.onSurface }]}>
            Data selecionada: <Text style={{ fontWeight: "700", color: colors.brandPrimary }}>{selectedDay}</Text>
          </Text>
          <View style={styles.quickButtons}>
            <Pressable
              testID={`${testID}-mark-present`}
              onPress={() => onQuickLog && onQuickLog(selectedDay, "presente")}
              style={[styles.quickButton, { backgroundColor: colors.success }]}
            >
              <CheckCircle2 size={14} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.quickButtonText}>Presença</Text>
            </Pressable>

            <Pressable
              testID={`${testID}-mark-missed`}
              onPress={() => onQuickLog && onQuickLog(selectedDay, "falta")}
              style={[styles.quickButton, { backgroundColor: colors.error }]}
            >
              <XCircle size={14} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.quickButtonText}>Falta</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekdayText: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyDayCell: {
    width: "14.28%",
    height: 38,
    marginVertical: 2,
  },
  dayCell: {
    width: "14.28%",
    height: 38,
    marginVertical: 2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 13,
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
  },
  quickActionBar: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedDayLabel: {
    fontSize: 12,
  },
  quickButtons: {
    flexDirection: "row",
    gap: 8,
  },
  quickButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
