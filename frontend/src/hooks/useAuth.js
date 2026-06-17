import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearError,
  setError,
  updateUser,
  logout as logoutAction,
  login,
  register,
  verifyEmail,
  resendEmailVerification,
  forgotPassword,
  resetPassword,
  googleLogin,
  uploadDocuments,
  completeOnboarding
} from '@/store/slices/authSlice';

/**
 * Auth hook — Redux-backed, same ergonomic API as the legacy context
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, token, loading, error, isInitialized, onboardingComplete } = useAppSelector(
    (state) => state.auth
  );

  const handleLogin = useCallback(
    async (email, password) => {
      dispatch(clearError());
      try {
        const result = await dispatch(login({ email, password })).unwrap();
        return { success: true, user: result.user, token: result.token };
      } catch (err) {
        if (err?.requiresEmailVerification) {
          return {
            success: false,
            requiresEmailVerification: true,
            email: err.email,
            message: err.message
          };
        }
        return { success: false, error: err?.message || 'Login failed' };
      }
    },
    [dispatch]
  );

  const handleRegister = useCallback(
    async (name, email, password, phoneNumber) => {
      dispatch(clearError());
      try {
        const data = await dispatch(
          register({ name, email, password, phoneNumber })
        ).unwrap();
        if (data.requiresEmailVerification) {
          return {
            success: true,
            requiresEmailVerification: true,
            email: data.email,
            message: data.message,
            mockSent: data.mockSent
          };
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err?.message || 'Registration failed' };
      }
    },
    [dispatch]
  );

  const handleVerifyEmail = useCallback(
    async (email, code) => {
      dispatch(clearError());
      try {
        await dispatch(verifyEmail({ email, code })).unwrap();
        return { success: true };
      } catch (err) {
        return { success: false, error: err?.message || 'Verification failed' };
      }
    },
    [dispatch]
  );

  const handleResend = useCallback(
    async (email) => {
      dispatch(clearError());
      try {
        const data = await dispatch(resendEmailVerification({ email })).unwrap();
        return { success: true, message: data.message, mockSent: data.mockSent };
      } catch (err) {
        return { success: false, error: err?.message };
      }
    },
    [dispatch]
  );

  const handleForgot = useCallback(
    async (email) => {
      dispatch(clearError());
      try {
        const data = await dispatch(forgotPassword({ email })).unwrap();
        return { success: true, message: data.message };
      } catch (err) {
        return { success: false, error: err?.message };
      }
    },
    [dispatch]
  );

  const handleReset = useCallback(
    async (email, code, newPassword) => {
      dispatch(clearError());
      try {
        const data = await dispatch(resetPassword({ email, code, newPassword })).unwrap();
        return { success: true, message: data.message };
      } catch (err) {
        return { success: false, error: err?.message };
      }
    },
    [dispatch]
  );

  const handleGoogle = useCallback(
    async (credential) => {
      dispatch(clearError());
      try {
        const result = await dispatch(googleLogin({ credential })).unwrap();
        return {
          success: true,
          user: result.user,
          token: result.token,
          requiresProfileCompletion:
            result.requiresProfileCompletion || result.user?.requiresProfileCompletion
        };
      } catch (err) {
        return { success: false, error: err?.message };
      }
    },
    [dispatch]
  );

  const handleUploadDocs = useCallback(
    async (payload) => {
      try {
        const result = await dispatch(uploadDocuments(payload)).unwrap();
        return { success: true, verification: result?.verification };
      } catch (err) {
        return { success: false, error: err?.message };
      }
    },
    [dispatch]
  );

  return {
    user,
    token,
    loading,
    error,
    isInitialized,
    onboardingComplete,
    completeOnboarding: () => dispatch(completeOnboarding()),
    setError: (msg) => dispatch(setError(msg)),
    clearError: () => dispatch(clearError()),
    logout: () => dispatch(logoutAction()),
    login: handleLogin,
    register: handleRegister,
    verifyEmail: handleVerifyEmail,
    resendEmailVerification: handleResend,
    forgotPassword: handleForgot,
    resetPassword: handleReset,
    googleLogin: handleGoogle,
    uploadDocuments: handleUploadDocs,
    setUser: useCallback((payload) => dispatch(updateUser(payload)), [dispatch])
  };
};

export default useAuth;
