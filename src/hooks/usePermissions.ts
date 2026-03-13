"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Permission, ModuleName } from "@/types";

interface PermissionsMap {
  [module: string]: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

export function usePermissions() {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.role_id) {
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("permissions")
        .select("*")
        .eq("role_id", profile.role_id);

      if (data) {
        const map: PermissionsMap = {};
        data.forEach((p: Permission) => {
          map[p.module] = {
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit: p.can_edit,
            can_delete: p.can_delete,
          };
        });
        setPermissions(map);
      }
      setLoading(false);
    };

    loadPermissions();
  }, [profile?.role_id]);

  const can = useCallback((module: ModuleName, action: "view" | "create" | "edit" | "delete"): boolean => {
    // Admin always has full access
    if (profile?.role === "admin") return true;

    const perm = permissions[module];
    if (!perm) return false;

    switch (action) {
      case "view": return perm.can_view;
      case "create": return perm.can_create;
      case "edit": return perm.can_edit;
      case "delete": return perm.can_delete;
      default: return false;
    }
  }, [profile?.role, permissions]);

  const canViewModule = useCallback((module: ModuleName): boolean => can(module, "view"), [can]);

  const isAdmin = profile?.role === "admin";

  return { permissions, loading, can, canViewModule, isAdmin };
}
