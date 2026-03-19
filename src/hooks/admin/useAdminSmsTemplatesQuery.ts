import { useQuery } from "@tanstack/react-query";
import { listAdminSmsTemplates } from "@/lib/admin";

export function useAdminSmsTemplatesQuery() {
  return useQuery({
    queryKey: ["admin", "sms", "templates"],
    queryFn: async () => listAdminSmsTemplates(),
  });
}

