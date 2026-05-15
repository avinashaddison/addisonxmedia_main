import { createContext, useContext, ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

type BetterAuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type Session = {
  user: BetterAuthUser;
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date | string;
  };
};

// Compatibility shape: keep the same field names the rest of the app reads
// (user.id, user.email, user.user_metadata?.display_name) so existing components
// don't have to change.
type CompatUser = {
  id: string;
  email: string;
  user_metadata: { display_name: string };
};

type AuthContextValue = {
  user: CompatUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { data, isPending } = authClient.useSession();

  const user: CompatUser | null = data?.user
    ? {
        id: data.user.id,
        email: data.user.email,
        user_metadata: { display_name: data.user.name },
      }
    : null;

  const signOut = async () => {
    await authClient.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session: (data as Session | null) ?? null,
        loading: isPending,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
