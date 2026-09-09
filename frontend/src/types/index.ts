export type StudentStatus = "ativo" | "proximo_vencimento" | "inadimplente" | "inativo";
export type TrainingLevel = "Iniciante" | "Intermediário" | "Avançado" | "Atleta";
export type StudentGoal = "Hipertrofia" | "Emagrecimento" | "Definição" | "Condicionamento" | "Saúde / Qualidade de Vida" | "Reabilitação";
export type PlanType = "Mensal" | "Trimestral" | "Semestral" | "Anual";
export type AssessmentProtocol = "pollock3" | "pollock7" | "circumferences" | "manual";

export interface Student {
  id: string;
  name: string;
  photo_url?: string;
  birth_date?: string;
  age?: number;
  gender: "Masculino" | "Feminino";
  phone: string;
  email: string;
  height_cm: number;
  weight_kg: number;
  goal: StudentGoal;
  training_level: TrainingLevel;
  start_date: string;
  plan: PlanType;
  due_date: string;
  monthly_fee: number;
  status: StudentStatus;
  notes?: string;
  last_workout_date?: string;
  last_assessment_date?: string;
  days_without_workout?: number;
  created_at: string;
  updated_at: string;
}

export interface Circumferences {
  pescoco?: number;
  ombros?: number;
  torax?: number;
  cintura?: number;
  abdomen?: number;
  quadril?: number;
  braco_dir?: number;
  braco_esq?: number;
  antebraco_dir?: number;
  antebraco_esq?: number;
  coxa_dir?: number;
  coxa_esq?: number;
  panturrilha_dir?: number;
  panturrilha_esq?: number;
  custom_measures?: { name: string; value: number }[];
}

export interface Skinfolds {
  peitoral?: number;
  triceps?: number;
  subescapular?: number;
  axilar_media?: number;
  suprailiaca?: number;
  abdomen?: number;
  coxa?: number;
  panturrilha_medial?: number;
}

export interface AssessmentPhotos {
  front?: string;
  side?: string;
  back?: string;
}

export interface PhysicalAssessment {
  id: string;
  student_id: string;
  date: string;
  weight_kg: number;
  height_cm: number;
  age: number;
  gender: "Masculino" | "Feminino";
  bmi: number;
  protocol: AssessmentProtocol;
  skinfolds?: Skinfolds;
  circumferences: Circumferences;
  body_fat_pct: number;
  fat_mass_kg: number;
  lean_mass_kg: number;
  photos: AssessmentPhotos;
  notes?: string;
  created_at: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  sets: number;
  reps: string;
  load_kg?: number;
  rest_seconds: number;
  tempo?: string;
  notes?: string;
  muscle_group?: string;
}

export interface WorkoutRoutineDay {
  id: string;
  day_label: string; // "Treino A - Peito e Tríceps"
  target_muscles: string;
  exercises: ExerciseItem[];
}

export interface WorkoutPlan {
  id: string;
  student_id: string;
  title: string;
  goal: string;
  frequency_weekly: number;
  start_date: string;
  end_date?: string;
  days: WorkoutRoutineDay[];
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Anamnesis {
  id: string;
  student_id: string;
  goal: string;
  training_history: string;
  injuries: string;
  surgeries: string;
  medications: string;
  habits: string;
  routine: string;
  experience_weightlifting: string;
  restrictions: string;
  diet_notes?: string;
  notes: string;
  ai_analysis?: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: "presente" | "falta" | "justificado";
  workout_title?: string;
  duration_minutes?: number;
  notes?: string;
}

export interface AttendanceSummary {
  total_performed: number;
  total_missed: number;
  weekly_frequency: number;
  monthly_frequency: number;
  last_workout_date?: string;
  attended_dates: string[];
  missed_dates: string[];
}

export interface StudentHistoryEvent {
  id: string;
  student_id: string;
  date: string;
  type: "peso" | "treino" | "avaliacao" | "carga" | "presenca" | "anamnese" | "geral";
  title: string;
  description: string;
  value?: string;
  delta?: string;
  is_positive?: boolean;
}

export interface ChatMessage {
  id: string;
  student_id: string;
  sender: "personal" | "student";
  text: string;
  timestamp: string;
  read: boolean;
}

export interface AlertItem {
  id: string;
  type: "inactivity" | "workout_expiring" | "assessment_overdue" | "plan_expiring" | "payment_overdue";
  student_id: string;
  student_name: string;
  student_phone: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  action_label: string;
}

export interface DashboardSummary {
  total_students: number;
  active_students: number;
  new_students_this_month: number;
  pending_assessments: number;
  overdue_payments: number;
  inactive_students_7d: number;
  alerts: AlertItem[];
  recent_students: Student[];
}

export interface EvolutionIndicator {
  name: string;
  key: string;
  unit: string;
  baseline_value: number;
  previous_value: number;
  current_value: number;
  delta_total: number;
  delta_recent: number;
  is_positive_evolution: boolean;
}

export interface EvolutionResponse {
  student: Student;
  indicators: EvolutionIndicator[];
  history_dates: string[];
  weight_series: { date: string; value: number }[];
  body_fat_series: { date: string; value: number }[];
  lean_mass_series: { date: string; value: number }[];
  fat_mass_series: { date: string; value: number }[];
  circumferences_series: Record<string, { date: string; value: number }[]>;
  assessments_count: number;
}
