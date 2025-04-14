import { NavigationGuard } from 'vue-router';

export const authGuard: NavigationGuard = (to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('user');
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/auth');
  } else if (to.path === '/auth' && isAuthenticated) {
    next('/');
  } else {
    next();
  }
};
