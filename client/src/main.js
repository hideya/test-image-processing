import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import "./index.css";
import { useAuthStore } from "./hooks/use-auth.vue";

// Import pages
import AuthPage from "./pages/auth-page.vue";
import MainPage from "./pages/main-page.tsx";
import NotFound from "./pages/not-found.tsx";

// Create pinia (state management)
const pinia = createPinia();

// Create router
const routes = [
  {
    path: "/",
    component: MainPage,
    meta: { requiresAuth: true },
  },
  {
    path: "/auth",
    component: AuthPage,
  },
  {
    path: "/:pathMatch(.*)*",
    component: NotFound,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard for auth
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth) {
    try {
      const user = await authStore.fetchUser();
      if (user) {
        next();
      } else {
        next("/auth");
      }
    } catch (error) {
      next("/auth");
    }
  } else {
    next();
  }
});

// Create and mount app
const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount("#root");
