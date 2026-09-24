"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { UserRole, ROLE_META, RoleMeta } from "@/config/roleConfig";

// ──────────────────────────────────────────────────────────────
// RoleContext: Fetches & provides the user's role from Supabase
// ──────────────────────────────────────────────────────────────

export interface RoleContextType {
  /** Current user role. 'unset' means they haven't picked one yet. */
  role: UserRole;
  /** True once the role has been fetched from the database */
  isLoaded: boolean;
  /** True if the role has been set (not 'unset') */
  isRoleSet: boolean;
  /** Metadata for the current role (label, color, icon, etc.) */
  roleMeta: RoleMeta | null;
  /** Set the role for first-time users */
  setInitialRole: (newRole: Exclude<UserRole, "unset">) => Promise<boolean>;
  /** Switch to a different operational role */
  switchRole: (newRole: Exclude<UserRole, "unset">) => Promise<boolean>;
}

const RoleContext = createContext<RoleContextType | null>(null);

interface RoleProviderProps {
  userId: string;
  children: ReactNode;
}

export function RoleProvider({ userId, children }: RoleProviderProps) {
  const [role, setRole] = useState<UserRole>("unset");
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch the role from Supabase profiles on mount
  useEffect(() => {
    if (!userId) return;

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .single();

        if (error) {
          console.warn("[RoleContext] Failed to fetch role:", error.message);
          const cached = typeof window !== "undefined" ? localStorage.getItem("aerotwin_user_role") : null;
          if (cached && (cached === "gcs_operator" || cached === "propulsion_engineer" || cached === "maintenance_tech")) {
            setRole(cached as UserRole);
          } else {
            setRole("unset");
          }
        } else {
          const dbRole = data?.role as UserRole;
          if (
            dbRole === "gcs_operator" ||
            dbRole === "propulsion_engineer" ||
            dbRole === "maintenance_tech"
          ) {
            setRole(dbRole);
            if (typeof window !== "undefined") localStorage.setItem("aerotwin_user_role", dbRole);
          } else {
            setRole("unset");
          }
        }
      } catch (err) {
        console.warn("[RoleContext] Error fetching role:", err);
        setRole("unset");
      } finally {
        setIsLoaded(true);
      }
    };

    fetchRole();
  }, [userId]);

  // Set initial role — only works when current role is 'unset' / 'viewer'
  const setInitialRole = useCallback(
    async (newRole: Exclude<UserRole, "unset">): Promise<boolean> => {
      if (!userId) return false;
      setRole(newRole);
      if (typeof window !== "undefined") localStorage.setItem("aerotwin_user_role", newRole);

      try {
        const { error: rpcError } = await supabase.rpc("set_initial_role", {
          new_role: newRole,
        });

        if (rpcError) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", userId);

          if (updateError) {
            console.error("[RoleContext] Failed to set role in database:", updateError.message);
          }
        }
        return true;
      } catch (err) {
        console.error("[RoleContext] Error setting role:", err);
        return true;
      }
    },
    [userId]
  );

  // Switch role anytime
  const switchRole = useCallback(
    async (newRole: Exclude<UserRole, "unset">): Promise<boolean> => {
      setRole(newRole);
      if (typeof window !== "undefined") localStorage.setItem("aerotwin_user_role", newRole);

      if (!userId) return true;

      try {
        await supabase
          .from("profiles")
          .update({ role: newRole })
          .eq("id", userId);
        return true;
      } catch (err) {
        console.warn("[RoleContext] switchRole db update warning:", err);
        return true;
      }
    },
    [userId]
  );

  const isRoleSet = role !== "unset";
  const roleMeta = isRoleSet ? ROLE_META[role as Exclude<UserRole, "unset">] : null;

  return (
    <RoleContext.Provider
      value={{ role, isLoaded, isRoleSet, roleMeta, setInitialRole, switchRole }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a <RoleProvider>");
  }
  return context;
}
