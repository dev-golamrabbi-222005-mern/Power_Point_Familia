import React, { useState } from "react";
import { AdminEditUserModal } from "./AdminEditUserModal";
import { AdminUserTableRow } from "./AdminUserTableRow";
import { User, UserRole } from "@/src/types";
import {
  Users,
  Search,
  RefreshCw,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showWarningAlert, showConfirmAlert } from "@/src/lib/alerts";

interface AdminUserDirectoryTabProps {
  currentUser: User;
  token: string;
  allUsers: User[];
  loadingUsers: boolean;
  onRefreshData: () => void;
}

export default function AdminUserDirectoryTab({
  currentUser,
  token,
  allUsers,
  loadingUsers,
  onRefreshData,
}: AdminUserDirectoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("member");
  const [editStatus, setEditStatus] = useState<User["status"]>("approved");
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (usr: User) => {
    setEditingUser(usr);
    setEditName(usr.name || "");
    setEditEmail(usr.email || "");
    setEditPhone(usr.phone || "");
    setEditRole(usr.role);
    setEditStatus(usr.status);
  };

  const handleSaveFullUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setSavingEdit(true);
      const res = await fetch(`/api/members/${editingUser.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          role: editRole,
          status: editStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to update user profile");

      showSuccessAlert("Success", "User profile updated successfully");
      setEditingUser(null);
      onRefreshData();
    } catch (err: any) {
      showErrorAlert("Update Error", err.message || "Error updating user profile");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (usr: User) => {
    if (usr.id === currentUser.id) {
      showWarningAlert("Action Not Allowed", "You cannot delete your own active account!");
      return;
    }

    const confirmed = await showConfirmAlert(
      "Delete User?",
      `Are you sure you want to permanently delete user "${usr.name}" (${usr.email})? This action cannot be undone!`,
      "Yes, Delete"
    );
    if (!confirmed) {
      return;
    }

    setUpdatingId(usr.id);
    try {
      const res = await fetch(`/api/members/${usr.id}/role`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete user");
      showSuccessAlert("Deleted", "User deleted successfully");
      onRefreshData();
    } catch (err: any) {
      showErrorAlert("Delete Error", err.message || "Error deleting user");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateUserRoleAndStatus = async (
    targetId: string,
    newRole: UserRole,
    newStatus: User["status"],
  ) => {
    if (targetId === currentUser.id) {
      showWarningAlert("Action Not Allowed", "You cannot modify your own active role!");
      return;
    }
    setUpdatingId(targetId);
    try {
      const response = await fetch(`/api/members/${targetId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole, status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update.");
      showSuccessAlert("Updated", "User role/status updated successfully");
      onRefreshData();
    } catch (err: any) {
      showErrorAlert("Error", err.message || "Error updating user.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" /> User Directory &
            Access Control
          </h3>
          <p className="text-xs text-zinc-400">
            Admin A-Z control panel for editing user details, status, ban, and
            deletion
          </p>
        </div>
        <button
          onClick={onRefreshData}
          disabled={loadingUsers}
          className="p-2 border border-zinc-800 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <RefreshCw
            className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`}
          />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-bold">Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="user">Guests (Pending)</option>
            <option value="member">Members</option>
            <option value="manager">Managers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto border border-zinc-800/80 rounded-xl">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 bg-zinc-900 text-zinc-400 font-mono text-[10px] uppercase tracking-wider z-10">
            <tr className="border-b border-zinc-800">
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Admin Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filteredUsers.map((usr) => (
              <AdminUserTableRow
                key={usr.id}
                usr={usr}
                currentUser={currentUser}
                updatingId={updatingId}
                onOpenEditModal={openEditModal}
                onDeleteUser={handleDeleteUser}
                onUpdateRoleAndStatus={handleUpdateUserRoleAndStatus}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* FULL A-Z USER EDITING MODAL */}
      <AdminEditUserModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleSaveFullUserEdit}
        editName={editName}
        setEditName={setEditName}
        editEmail={editEmail}
        setEditEmail={setEditEmail}
        editPhone={editPhone}
        setEditPhone={setEditPhone}
        editRole={editRole}
        setEditRole={setEditRole}
        editStatus={editStatus}
        setEditStatus={setEditStatus}
        savingEdit={savingEdit}
      />
    </div>
  );
}
