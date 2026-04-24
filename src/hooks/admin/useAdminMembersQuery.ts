import { useQuery } from "@tanstack/react-query";
import { listAdminMembers, type AdminMemberSort } from "@/lib/adminMembers";

export function useAdminMembersQuery(
  params: {
    search?: string;
    status?: string;
    profileStatus?: string;
    role?: string;
    groupId?: string;
    sort?: AdminMemberSort;
    page?: number;
    limit?: number;
  } = {},
  enabled = true,
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  return useQuery({
    queryKey: [
      "admin",
      "members",
      params.search ?? "",
      params.status ?? "all",
      params.profileStatus ?? "all",
      params.role ?? "all",
      params.groupId ?? "all",
      params.sort ?? "newest",
      page,
      limit,
    ],
    enabled,
    queryFn: () =>
      listAdminMembers({
        ...params,
        page,
        limit,
      }),
  });
}
