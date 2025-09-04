import { MockUser } from "./mockUsers";

export const plantAdminLimited: MockUser = {
  id: 5,
  username: "plantadmin2",
  password: "plantadmin456",
  role: "plantAdmin",
  permissions: [
    "dashboard:view",
    "plantMaster:view",
    "plantMaster:edit",
    "roleMaster:view",
    "roleMaster:edit",
  ],
};
