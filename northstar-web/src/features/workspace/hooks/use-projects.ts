import { useQuery } from "@tanstack/react-query";
import { getProjects } from "../api/workspace.api";
import { workspaceKeys } from "../api/workspace-query-keys";

export const useProjects = () => {
  return useQuery({
    queryKey: workspaceKeys.projects(),
    queryFn: getProjects,
  });
};
