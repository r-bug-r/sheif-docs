export interface UserItem {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  permission: "owner" | "edit" | "view";
  created_at: string;
  updated_at: string;
}

export interface ShareItem {
  id: string;
  document_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  avatar_color: string;
  permission: "view" | "edit";
  created_at: string;
}
