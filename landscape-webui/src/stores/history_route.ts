import { defineStore } from "pinia";
import { RouteLocationNormalized } from "vue-router";

const MAX_VISITED_ROUTES = 6;

export interface HistoryRoute {
  name: string;
  path: string;
  meta: any;
  pinned?: boolean;
}

export const useHistoryRouteStore = defineStore("history_route", {
  state: () => ({
    visitedRoutes: [] as HistoryRoute[],
  }),
  actions: {
    addRoute(route: RouteLocationNormalized) {
      if (!route.path) return;
      if (route.path === "/login") return;

      const existing = this.visitedRoutes.find((r) => r.path === route.path);
      if (existing) {
        existing.name = (route.name as string) || "Home";
        existing.meta = route.meta;
      } else {
        this.visitedRoutes.push({
          name: (route.name as string) || "Home",
          path: route.path,
          meta: route.meta,
          pinned: false,
        });
      }

      while (this.visitedRoutes.length > MAX_VISITED_ROUTES) {
        const index = this.visitedRoutes.findIndex(
          (item) => !item.pinned && item.path !== route.path,
        );
        this.visitedRoutes.splice(index >= 0 ? index : 0, 1);
      }
    },
    removeRoute(path: string) {
      const index = this.visitedRoutes.findIndex((r) => r.path === path);
      if (index !== -1) {
        this.visitedRoutes.splice(index, 1);
      }
    },
    togglePin(path: string) {
      const route = this.visitedRoutes.find((r) => r.path === path);
      if (route) {
        route.pinned = !route.pinned;
      }
    },
    clearRoutes() {
      this.visitedRoutes = this.visitedRoutes.filter((r) => r.pinned);
    },
    resetRoutes() {
      this.visitedRoutes = [];
    },
  },
  persist: true,
});
