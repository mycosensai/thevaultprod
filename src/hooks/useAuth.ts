import { trpc } from "@/providers/trpc";
import { useCallback, useMemo } from "react";

type UnifiedUser = {
  id: number;
  name: string | null;
  email: string | null;
  avatar: string | null;
  role: "user" | "admin";
  createdAt: Date;
};

export function useAuth() {
  const utils = trpc.useUtils();

  // Query OAuth user
  const {
    data: oauthUser,
    isLoading: oauthLoading,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // Query local auth user
  const {
    data: localUser,
    isLoading: localLoading,
  } = trpc.localAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
  });

  const user: UnifiedUser | null = useMemo(() => {
    if (oauthUser) {
      return {
        id: oauthUser.id,
        name: oauthUser.name,
        email: oauthUser.email,
        avatar: oauthUser.avatar,
        role: oauthUser.role as "user" | "admin",
        createdAt: oauthUser.createdAt,
      };
    }
    if (localUser) {
      return {
        id: localUser.id,
        name: localUser.name,
        email: localUser.email,
        avatar: localUser.avatar,
        role: localUser.role as "user" | "admin",
        createdAt: localUser.createdAt,
      };
    }
    return null;
  }, [oauthUser, localUser]);

  const isLoading = oauthLoading || localLoading;
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem("local_auth_token");
      localStorage.removeItem("local_auth_token");
    } catch (err) {
      console.error("Unable to clear auth token", err);
    }
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        window.location.reload();
      },
    });
  }, [logoutMutation]);

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      isAdmin,
      logout,
    }),
    [user, isAuthenticated, isLoading, isAdmin, logout]
  );
}
