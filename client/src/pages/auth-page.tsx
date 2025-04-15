import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../hooks/use-auth";

// Form validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Password confirmation is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      console.log('*** AuthPage: User detected, redirecting to home');
      setLocation("/");
    } else {
      console.log('*** AuthPage: No user detected, staying on auth page');
    }
  }, [user, setLocation]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    console.log('*** AuthPage: Login form submitted with username:', data.username);
    // Clear any previous server errors
    setServerError(null);
    loginMutation.mutate(data, {
      onError: (error) => {
        // Save server error to display it in the form
        setServerError(error.message);
        console.log('*** Login error captured in form handler:', error.message);
      }
    });
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    console.log('*** AuthPage: Register form submitted with username:', data.username);
    // Clear any previous server errors
    setServerError(null);
    registerMutation.mutate(data, {
      onError: (error) => {
        // Save server error to display it in the form
        setServerError(error.message);
      }
    });
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-stone-900">
              {isLogin ? "Sign in to your account" : "Create a new account"}
            </h2>
          </div>

          {isLogin ? (
            <form className="mt-8 space-y-6" onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{serverError}</span>
                </div>
              )}
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="username" className="sr-only">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    {...loginForm.register("username")}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-500 text-stone-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Username"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="mt-1 text-xs text-red-600">
                      {loginForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-500 text-stone-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Sign in
                </button>
              </div>
            </form>
          ) : (
            <form
              className="mt-8 space-y-6"
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
            >
              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">{serverError}</span>
                </div>
              )}
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="register-username" className="sr-only">
                    Username
                  </label>
                  <input
                    id="register-username"
                    type="text"
                    autoComplete="username"
                    {...registerForm.register("username")}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-500 text-stone-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Username"
                  />
                  {registerForm.formState.errors.username && (
                    <p className="mt-1 text-xs text-red-600">
                      {registerForm.formState.errors.username.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...registerForm.register("email")}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-500 text-stone-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">
                      {registerForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="register-password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    {...registerForm.register("password")}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-500 text-stone-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">
                      {registerForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="confirm-password" className="sr-only">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    {...registerForm.register("confirmPassword")}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-500 text-stone-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm Password"
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">
                      {registerForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Sign up
                </button>
              </div>
            </form>
          )}
          <div className="flex justify-center mt-4">
            <div className="text-sm text-stone-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="flex-1 bg-gradient-to-br from-blue-500 to-purple-600 p-12 flex flex-col justify-center text-white">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-6">Photo Analyzer</h1>
          <p className="text-xl mb-8">
            Upload and analyze your photos with our advanced image processing technology
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-blue-200 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Calculate precise angles in your images</span>
            </li>
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-blue-200 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Track measurements over time with interactive charts</span>
            </li>
            <li className="flex items-start">
              <svg
                className="h-6 w-6 text-blue-200 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Secure cloud storage for all your analyzed images</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}