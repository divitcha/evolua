import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";
import {
  Student,
  PhysicalAssessment,
  WorkoutPlan,
  Anamnesis,
  AttendanceRecord,
  AttendanceSummary,
  StudentHistoryEvent,
  ChatMessage,
  DashboardSummary,
  EvolutionResponse,
} from "../types";

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
export const AUTH_TOKEN_KEY = "apex_auth_token";

/** Resolves a stored image reference into a full displayable URL. */
export function resolveImageUrl(ref?: string | null): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  if (ref.startsWith("/api/")) return `${BACKEND_URL}${ref}`;
  // Bare storage path
  return `${BACKEND_URL}/api/files/${ref}`;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}/api${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const token = await storage.secureGet(AUTH_TOKEN_KEY, "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    await storage.secureRemove(AUTH_TOKEN_KEY);
    throw new Error("401: Sessão expirada. Faça login novamente.");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody || response.statusText}`);
  }

  return response.json();
}

export interface AuthResult {
  access_token: string;
  token_type: string;
  trainer: { id: string; name: string; email: string };
}

export const api = {
  // Auth
  register: (name: string, email: string, password: string) =>
    apiRequest<AuthResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email: string, password: string) =>
    apiRequest<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  loginStudent: (email: string, password: string) =>
    apiRequest<{ access_token: string; student: { id: string; name: string; email: string } }>("/auth/student/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => apiRequest<{ id: string; name: string; email: string }>("/auth/me"),

  // Image upload (Object Storage) — handles web vs native FormData
  uploadImage: async (uri: string): Promise<{ path: string; url: string }> => {
    const token = await storage.secureGet(AUTH_TOKEN_KEY, "");
    const name = `photo_${Date.now()}.jpg`;
    const form = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(uri)).blob();
      form.append("file", blob, name);
    } else {
      form.append("file", { uri, name, type: "image/jpeg" } as any);
    }
    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error(`Upload falhou: ${res.status}`);
    return res.json();
  },

  // Push notifications
  registerPush: (user_id: string, platform: string, device_token: string) =>
    apiRequest<{ status: string }>("/register-push", {
      method: "POST",
      body: JSON.stringify({ user_id, platform, device_token }),
    }),
  notifyAlerts: () =>
    apiRequest<{ sent: boolean; message: string }>("/alerts/notify", { method: "POST" }),

  // Dashboard
  getDashboard: () => apiRequest<DashboardSummary>("/dashboard/summary"),

  // Students
  getStudents: (params?: { search?: string; status?: string; goal?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.status && params.status !== "todos") query.append("status", params.status);
    if (params?.goal && params.goal !== "todos") query.append("goal", params.goal);
    const queryString = query.toString() ? `?${query.toString()}` : "";
    return apiRequest<Student[]>(`/students${queryString}`);
  },
  getStudent: (id: string) => apiRequest<Student>(`/students/${id}`),
  createStudent: (student: Partial<Student>) =>
    apiRequest<Student>("/students", {
      method: "POST",
      body: JSON.stringify(student),
    }),
  updateStudent: (id: string, student: Partial<Student>) =>
    apiRequest<Student>(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(student),
    }),
  deleteStudent: (id: string) =>
    apiRequest<{ success: boolean }>(`/students/${id}`, {
      method: "DELETE",
    }),

  // Physical Assessments
  getAssessments: (studentId?: string) => {
    const q = studentId ? `?student_id=${studentId}` : "";
    return apiRequest<PhysicalAssessment[]>(`/assessments${q}`);
  },
  getAssessment: (id: string) => apiRequest<PhysicalAssessment>(`/assessments/${id}`),
  createAssessment: (assessment: Partial<PhysicalAssessment>) =>
    apiRequest<PhysicalAssessment>("/assessments", {
      method: "POST",
      body: JSON.stringify(assessment),
    }),
  calculatePollock: (data: {
    protocol: "pollock3" | "pollock7";
    gender: "Masculino" | "Feminino";
    age: number;
    weight_kg: number;
    height_cm: number;
    skinfolds: Record<string, number>;
  }) =>
    apiRequest<{
      body_fat_pct: number;
      fat_mass_kg: number;
      lean_mass_kg: number;
      bmi: number;
      density: number;
    }>("/assessments/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getStudentEvolution: (studentId: string, range?: string) => {
    const q = range ? `?range=${range}` : "";
    return apiRequest<EvolutionResponse>(`/students/${studentId}/evolution${q}`);
  },

  // Workouts
  getWorkouts: (studentId?: string) => {
    const q = studentId ? `?student_id=${studentId}` : "";
    return apiRequest<WorkoutPlan[]>(`/workouts${q}`);
  },
  getWorkout: (id: string) => apiRequest<WorkoutPlan>(`/workouts/${id}`),
  createWorkout: (workout: Partial<WorkoutPlan>) =>
    apiRequest<WorkoutPlan>("/workouts", {
      method: "POST",
      body: JSON.stringify(workout),
    }),
  updateWorkout: (id: string, workout: Partial<WorkoutPlan>) =>
    apiRequest<WorkoutPlan>(`/workouts/${id}`, {
      method: "PUT",
      body: JSON.stringify(workout),
    }),

  // Anamnesis
  getAnamnesis: (studentId: string) => apiRequest<Anamnesis>(`/students/${studentId}/anamnesis`),
  saveAnamnesis: (studentId: string, data: Partial<Anamnesis>) =>
    apiRequest<Anamnesis>(`/students/${studentId}/anamnesis`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Attendance & Calendar
  getAttendance: (studentId: string, month?: string) => {
    const q = month ? `?month=${month}` : "";
    return apiRequest<{ records: AttendanceRecord[]; summary: AttendanceSummary }>(
      `/students/${studentId}/attendance${q}`
    );
  },
  logAttendance: (studentId: string, data: { date: string; status: "presente" | "falta" | "justificado"; notes?: string }) =>
    apiRequest<AttendanceRecord>(`/students/${studentId}/attendance`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Student Chronological History
  getStudentHistory: (studentId: string) =>
    apiRequest<StudentHistoryEvent[]>(`/students/${studentId}/history`),
  addHistoryEvent: (studentId: string, event: Partial<StudentHistoryEvent>) =>
    apiRequest<StudentHistoryEvent>(`/students/${studentId}/history`, {
      method: "POST",
      body: JSON.stringify(event),
    }),

  // Chat Messages
  getMessages: (studentId: string) => apiRequest<ChatMessage[]>(`/students/${studentId}/messages`),
  sendMessage: (studentId: string, text: string, sender: "personal" | "student" = "personal") =>
    apiRequest<ChatMessage>(`/students/${studentId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text, sender }),
    }),

  // AI Assistant
  askAIAssistant: (prompt: string, context?: Record<string, any>) =>
    apiRequest<{ reply: string; structured_data?: any }>("/ai/assistant", {
      method: "POST",
      body: JSON.stringify({ prompt, context }),
    }),

  // Seed sample data
  seedData: () => apiRequest<{ message: string; count: number }>("/seed", { method: "POST" }),
};
