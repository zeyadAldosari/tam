<script setup>
import { computed, reactive, ref, watch } from "vue";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

const storedToken = localStorage.getItem("access_token") || "";
const storedUsername = localStorage.getItem("username") || "";

const token = ref(storedToken);
const currentUsername = ref(storedUsername);

api.interceptors.request.use((config) => {
  if (token.value) {
    config.headers.Authorization = `Bearer ${token.value}`;
  }
  return config;
});

const authMode = ref("signin");
const authForm = reactive({
  username: storedUsername,
  password: "",
});
const authLoading = ref(false);
const authError = ref("");
const authFormRef = ref(null);
const taskFormRef = ref(null);

const rules = {
  username: [(value) => !!value?.trim() || "Username is required."],
  password: [(value) => !!value || "Password is required."],
  title: [
    (value) => !!value?.trim() || "Title is required.",
    (value) =>
      (value?.trim()?.length ?? 0) >= 4 ||
      "Title must be at least 4 characters.",
  ],
  description: [(value) => !!value?.trim() || "Description is required."],
};

const tasks = ref([]);
const loadingTasks = ref(false);
const taskDialog = ref(false);
const taskSubmitting = ref(false);
const confirmDialog = ref(false);
const taskToDelete = ref(null);

const filters = reactive({
  q: "",
  status: null,
  priority: null,
});

let filterTimer = null;

const statusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
];

const priorityOptions = [
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const headers = [
  { title: "Task", key: "title" },
  { title: "Status", key: "status", width: "120px" },
  { title: "Priority", key: "priority", width: "120px" },
  { title: "Updated", key: "updatedAt", width: "170px" },
  { title: "", key: "actions", sortable: false, width: "140px" },
];

const emptyTask = () => ({
  id: null,
  title: "",
  description: "",
  status: "PENDING",
  priority: "MEDIUM",
});

const activeTask = reactive(emptyTask());

const snackbar = reactive({
  show: false,
  color: "success",
  message: "",
});

const metrics = computed(() => ({
  total: tasks.value.length,
  completed: tasks.value.filter((task) => task.status === "COMPLETED").length,
  highPriority: tasks.value.filter((task) => task.priority === "HIGH").length,
}));

const displayedTasks = computed(() =>
  [...tasks.value].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
  )
);

const isAuthenticated = computed(() => Boolean(token.value));

watch(
  () => token.value,
  async (newToken) => {
    if (newToken) {
      await fetchTasks();
    } else {
      tasks.value = [];
    }
  },
  { immediate: true }
);

watch(
  () => ({ ...filters }),
  () => {
    if (!isAuthenticated.value) return;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(fetchTasks, 250);
  },
  { deep: true }
);

const notify = (message, color = "success") => {
  snackbar.message = message;
  snackbar.color = color;
  snackbar.show = true;
};

const handleAuth = async () => {
  authError.value = "";
  const validation = authFormRef.value
    ? await authFormRef.value.validate()
    : { valid: !!authForm.username && !!authForm.password };

  if (!validation.valid) {
    authError.value = "Please fill in the required fields.";
    return;
  }

  authLoading.value = true;
  try {
    const endpoint =
      authMode.value === "signin" ? "/auth/signIn" : "/auth/signUp";
    const payload = {
      username: authForm.username.trim(),
      password: authForm.password,
    };
    const { data } = await api.post(endpoint, payload);
    if (data?.access_token) {
      token.value = data.access_token;
      currentUsername.value = payload.username;
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", payload.username);
      notify(
        authMode.value === "signin"
          ? "Signed in successfully."
          : "Account created and signed in."
      );
      await fetchTasks();
      authForm.password = "";
      authFormRef.value?.resetValidation();
    } else {
      notify("Signed in but did not receive a token.", "warning");
    }
  } catch (error) {
    authError.value =
      error.response?.data?.message || "Unable to authenticate right now.";
  } finally {
    authLoading.value = false;
  }
};

const logout = () => {
  token.value = "";
  currentUsername.value = "";
  authForm.password = "";
  authFormRef.value?.resetValidation();
  localStorage.removeItem("access_token");
  localStorage.removeItem("username");
  notify("Signed out.", "secondary");
};

const fetchTasks = async () => {
  if (!isAuthenticated.value) return;
  loadingTasks.value = true;
  try {
    const { data } = await api.get("/task", {
      params: {
        q: filters.q || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
      },
    });
    tasks.value = Array.isArray(data) ? data : [];
  } catch (error) {
    notify(
      error.response?.data?.message || "Failed to load tasks from the server.",
      "error"
    );
  } finally {
    loadingTasks.value = false;
  }
};

const openTaskDialog = (task = null) => {
  Object.assign(activeTask, task ? { ...task } : emptyTask());
  taskFormRef.value?.resetValidation();
  taskDialog.value = true;
};

const closeTaskDialog = () => {
  taskDialog.value = false;
  taskFormRef.value?.resetValidation();
  Object.assign(activeTask, emptyTask());
};

const submitTask = async () => {
  const validation = taskFormRef.value
    ? await taskFormRef.value.validate()
    : {
        valid: !!activeTask.title?.trim() && !!activeTask.description?.trim(),
      };

  if (!validation.valid) {
    notify("Please fix the highlighted fields.", "warning");
    return;
  }

  taskSubmitting.value = true;
  const payload = {
    title: activeTask.title.trim(),
    description: activeTask.description.trim(),
    status: activeTask.status,
    priority: activeTask.priority,
  };

  try {
    if (activeTask.id) {
      await api.patch(`/task/${activeTask.id}`, payload);
      notify("Task updated.");
    } else {
      await api.post("/task", payload);
      notify("Task created.");
    }
    await fetchTasks();
    closeTaskDialog();
  } catch (error) {
    notify(
      error.response?.data?.message || "Could not save the task right now.",
      "error"
    );
  } finally {
    taskSubmitting.value = false;
  }
};

const confirmRemove = (task) => {
  taskToDelete.value = task;
  confirmDialog.value = true;
};

const deleteTask = async () => {
  if (!taskToDelete.value) return;
  try {
    await api.delete(`/task/${taskToDelete.value.id}`);
    notify("Task deleted.");
    await fetchTasks();
  } catch (error) {
    notify(error.response?.data?.message || "Failed to delete task.", "error");
  } finally {
    confirmDialog.value = false;
    taskToDelete.value = null;
  }
};

const statusLabel = (value) =>
  statusOptions.find((option) => option.value === value)?.label || value;

const priorityLabel = (value) =>
  priorityOptions.find((option) => option.value === value)?.label || value;

const statusColor = (value) => {
  switch (value) {
    case "COMPLETED":
      return "success";
    case "IN_PROGRESS":
      return "warning";
    default:
      return "info";
  }
};

const priorityColor = (value) => {
  switch (value) {
    case "HIGH":
      return "error";
    case "MEDIUM":
      return "primary";
    default:
      return "secondary";
  }
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString();
};

const updateStatus = async (task, status) => {
  if (!task?.id) return;
  try {
    await api.patch(`/task/${task.id}`, { status });
    notify(`Status updated to ${statusLabel(status)}.`);
    await fetchTasks();
  } catch (error) {
    notify(
      error.response?.data?.message || "Unable to update status.",
      "error"
    );
  }
};
</script>

<template>
  <v-app>
    <div class="bg-grid"></div>
    <v-app-bar flat color="transparent" class="blurred-bar">
      <v-app-bar-title class="font-title text-ink">
        <v-icon icon="mdi-rocket-launch" color="primary" class="mr-2" />
        Task Managment
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-chip
        v-if="isAuthenticated"
        color="success"
        variant="tonal"
        prepend-icon="mdi-shield-check-outline"
        class="mr-2"
      >
        Authenticated
      </v-chip>
      <v-chip
        v-else
        color="warning"
        variant="tonal"
        prepend-icon="mdi-lock-alert"
        class="mr-2"
      >
        Sign in required
      </v-chip>
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        class="mr-2"
        :disabled="!isAuthenticated"
        @click="openTaskDialog()"
      >
        New Task
      </v-btn>
      <v-btn
        v-if="isAuthenticated"
        variant="text"
        prepend-icon="mdi-logout"
        @click="logout"
      >
        Sign out
      </v-btn>
    </v-app-bar>

    <v-main class="main-shell">
      <v-container class="py-10">
        <v-card class="glass mb-10" elevation="10">
          <v-card-text>
            <v-form ref="authFormRef" @submit.prevent="handleAuth">
              <v-btn-toggle
                v-model="authMode"
                color="primary"
                class="w-100 mb-4"
                mandatory
              >
                <v-btn value="signin" prepend-icon="mdi-login">Sign in</v-btn>
                <v-btn value="signup" prepend-icon="mdi-account-plus"
                  >Create account</v-btn
                >
              </v-btn-toggle>

              <v-alert
                v-if="authError"
                type="error"
                variant="tonal"
                density="compact"
                class="mb-4"
              >
                {{ authError }}
              </v-alert>

              <v-text-field
                v-model="authForm.username"
                label="Username"
                prepend-inner-icon="mdi-account"
                autocomplete="username"
                class="mb-2"
                :rules="rules.username"
                :disabled="authLoading"
              />
              <v-text-field
                v-model="authForm.password"
                label="Password"
                type="password"
                prepend-inner-icon="mdi-shield-lock"
                autocomplete="current-password"
                class="mb-4"
                :rules="rules.password"
                :disabled="authLoading"
              />
              <v-btn
                block
                color="primary"
                size="large"
                :loading="authLoading"
                type="submit"
              >
                {{
                  authMode === "signin"
                    ? "Sign in & load tasks"
                    : "Sign up & start"
                }}
              </v-btn>
              <v-alert
                v-if="isAuthenticated"
                type="success"
                variant="tonal"
                class="mt-4"
                icon="mdi-check-decagram"
              >
                Connected{{ currentUsername ? ` as ${currentUsername}` : "" }}.
                Use the New Task button to add items.
              </v-alert>
            </v-form>
          </v-card-text>
        </v-card>

        <v-card class="glass" elevation="12">
          <v-card-title class="d-flex align-center justify-space-between">
            <div>
              <div class="text-overline text-secondary">Task board</div>
              <div class="font-title text-h6 text-ink">Your tasks</div>
            </div>
            <v-btn
              icon
              variant="tonal"
              color="secondary"
              @click="fetchTasks"
              :disabled="!isAuthenticated"
              :loading="loadingTasks"
            >
              <v-icon icon="mdi-refresh"></v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text>
            <v-row class="mb-4" dense>
              <v-col cols="12" md="5">
                <v-text-field
                  v-model="filters.q"
                  label="Search title or description"
                  prepend-inner-icon="mdi-magnify"
                  :disabled="!isAuthenticated"
                  clearable
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filters.status"
                  :items="statusOptions"
                  label="Status filter"
                  item-title="label"
                  item-value="value"
                  prepend-inner-icon="mdi-progress-check"
                  clearable
                  :disabled="!isAuthenticated"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filters.priority"
                  :items="priorityOptions"
                  label="Priority filter"
                  item-title="label"
                  item-value="value"
                  prepend-inner-icon="mdi-flag-variant"
                  clearable
                  :disabled="!isAuthenticated"
                />
              </v-col>
            </v-row>

            <v-sheet
              v-if="!isAuthenticated"
              class="pa-6 text-center glass"
              color="transparent"
              border
            >
              <v-icon icon="mdi-shield-lock" size="38" color="warning" />
              <div class="text-h6 font-title text-ink mt-2">
                Authentication required
              </div>
              <div class="text-body-2 text-secondary">
                Sign in to load and manage your tasks.
              </div>
            </v-sheet>

            <v-skeleton-loader
              v-else-if="loadingTasks"
              type="table-heading, table-row@5"
              class="mt-4"
            />

            <template v-else>
              <v-alert
                v-if="!displayedTasks.length"
                type="info"
                variant="tonal"
                class="mb-3"
              >
                Nothing here yet. Create a new task to get moving.
              </v-alert>

              <v-data-table
                v-else
                :headers="headers"
                :items="displayedTasks"
                item-key="id"
                class="elevated-table"
                hide-default-footer
              >
                <template #item.title="{ item }">
                  <div class="font-weight-semibold text-ink">
                    {{ item.title }}
                  </div>
                  <div class="text-caption text-secondary">
                    {{ item.description }}
                  </div>
                </template>

                <template #item.status="{ item }">
                  <v-chip
                    :color="statusColor(item.status)"
                    variant="tonal"
                    size="small"
                  >
                    {{ statusLabel(item.status) }}
                  </v-chip>
                </template>

                <template #item.priority="{ item }">
                  <v-chip
                    :color="priorityColor(item.priority)"
                    variant="tonal"
                    size="small"
                  >
                    {{ priorityLabel(item.priority) }}
                  </v-chip>
                </template>

                <template #item.updatedAt="{ item }">
                  <div class="text-caption text-secondary">
                    {{ formatDate(item.updatedAt || item.createdAt) }}
                  </div>
                </template>

                <template #item.actions="{ item }">
                  <div class="d-flex ga-2">
                    <v-btn
                      icon
                      size="small"
                      variant="tonal"
                      color="secondary"
                      @click="openTaskDialog(item)"
                    >
                      <v-icon icon="mdi-pencil" size="18"></v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="small"
                      variant="tonal"
                      color="success"
                      @click="updateStatus(item, 'COMPLETED')"
                    >
                      <v-icon icon="mdi-check-all" size="18"></v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="small"
                      variant="tonal"
                      color="error"
                      @click="confirmRemove(item)"
                    >
                      <v-icon icon="mdi-delete-outline" size="18"></v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-data-table>
            </template>
          </v-card-text>
        </v-card>
      </v-container>

      <v-dialog v-model="taskDialog" max-width="620">
        <v-card class="glass" elevation="12">
          <v-card-title class="d-flex justify-space-between align-center">
            <span class="font-title text-ink">
              {{ activeTask.id ? "Edit task" : "New task" }}
            </span>
            <v-btn icon variant="text" @click="closeTaskDialog">
              <v-icon icon="mdi-close" />
            </v-btn>
          </v-card-title>
          <v-form ref="taskFormRef" @submit.prevent="submitTask">
            <v-card-text>
              <v-text-field
                v-model="activeTask.title"
                label="Title"
                maxlength="80"
                :rules="rules.title"
                :disabled="taskSubmitting"
              />
              <v-textarea
                v-model="activeTask.description"
                label="Description"
                rows="3"
                :rules="rules.description"
                :disabled="taskSubmitting"
              />
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="activeTask.status"
                    :items="statusOptions"
                    item-title="label"
                    item-value="value"
                    label="Status"
                    :disabled="taskSubmitting"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="activeTask.priority"
                    :items="priorityOptions"
                    item-title="label"
                    item-value="value"
                    label="Priority"
                    :disabled="taskSubmitting"
                  />
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn variant="text" type="button" @click="closeTaskDialog"
                >Cancel</v-btn
              >
              <v-btn color="primary" :loading="taskSubmitting" type="submit">
                {{ activeTask.id ? "Update" : "Create" }}
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card>
      </v-dialog>

      <v-dialog v-model="confirmDialog" max-width="420">
        <v-card>
          <v-card-title class="font-title">Delete task?</v-card-title>
          <v-card-text>
            This cannot be undone.
            <strong>{{ taskToDelete ? taskToDelete.title : "" }}</strong> will
            be removed.
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="confirmDialog = false">Cancel</v-btn>
            <v-btn color="error" @click="deleteTask">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        timeout="3000"
      >
        {{ snackbar.message }}
      </v-snackbar>
    </v-main>
  </v-app>
</template>
