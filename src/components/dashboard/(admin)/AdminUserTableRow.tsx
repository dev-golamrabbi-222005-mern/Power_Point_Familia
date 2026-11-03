import React from "react";
import { User, UserRole } from "@/src/types";
import { Edit3, Trash2 } from "lucide-react";

interface AdminUserTableRowProps {
  usr: User;
  currentUser: User;
  updatingId: string | null;
  onOpenEditModal: (user: User) => void;
  onDeleteUser: (user: User) => void;
  onUpdateRoleAndStatus: (
    targetId: string,
    role: UserRole,
    status: User["status"]
  ) => void;
}

export function AdminUserTableRow({
  usr,
  currentUser,
  updatingId,
  onOpenEditModal,
  onDeleteUser,
  onUpdateRoleAndStatus,
}: AdminUserTableRowProps) {
  const isSelf = usr.id === currentUser.id;
  const isBusy = updatingId === usr.id;

  return (
    <tr className="hover:bg-zinc-900/40 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          {usr.image || usr.photoURL ? (
            <img
              src={usr.image || usr.photoURL}
              alt={usr.name}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-xl object-cover border border-zinc-700/80 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
              {usr.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-bold text-zinc-100 flex items-center gap-2">
              {usr.name}
              {isSelf && (
                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md uppercase">
                  Superuser (Me)
                </span>
              )}
            </p>
            <p className="text-[11px] text-zinc-500 font-mono">{usr.email}</p>
          </div>
        </div>
      </td>

      <td className="py-3 px-3 text-xs text-zinc-400 font-mono">
        {usr.phone || "N/A"}
      </td>

      <td className="py-3 px-3">
        <select
          disabled={isSelf || isBusy}
          value={usr.role}
          onChange={(e) =>
            onUpdateRoleAndStatus(usr.id, e.target.value as UserRole, usr.status)
          }
          className="px-2.5 py-1 bg-zinc-900 border border-zinc-700/60 rounded-lg text-xs font-bold text-zinc-200 disabled:opacity-50 cursor-pointer"
        >
          <option value="user">Guest</option>
          <option value="member">Member</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </td>

      <td className="py-3 px-3">
        <select
          disabled={isSelf || isBusy}
          value={usr.status}
          onChange={(e) =>
            onUpdateRoleAndStatus(usr.id, usr.role, e.target.value as any)
          }
          className={`px-2.5 py-1 border rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 ${
            usr.status === "approved"
              ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
              : usr.status === "rejected"
              ? "bg-red-500/15 border-red-500/25 text-red-400"
              : "bg-amber-500/15 border-amber-500/25 text-amber-400"
          }`}
        >
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected / Inactive</option>
        </select>
      </td>

      <td className="py-3 px-4 text-right">
        {isSelf ? (
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Superuser
          </span>
        ) : (
          <div className="flex justify-end gap-1.5 text-[11px] font-bold">
            <button
              onClick={() => onOpenEditModal(usr)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg cursor-pointer transition-all flex items-center gap-1"
              title="A-Z Full Profile Edit"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            {usr.role === "user" && (
              <button
                onClick={() =>
                  onUpdateRoleAndStatus(usr.id, "member", "approved")
                }
                className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/25 rounded-lg cursor-pointer transition-all"
              >
                Accept
              </button>
            )}

            {usr.role === "member" && (
              <button
                onClick={() =>
                  onUpdateRoleAndStatus(usr.id, "manager", "approved")
                }
                className="px-2.5 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/25 rounded-lg cursor-pointer transition-all"
              >
                Promote to Manager
              </button>
            )}

            {usr.role === "manager" && (
              <button
                onClick={() =>
                  onUpdateRoleAndStatus(usr.id, "member", "approved")
                }
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg cursor-pointer transition-all"
              >
                Demote to Member
              </button>
            )}

            <button
              onClick={() => onDeleteUser(usr)}
              disabled={isBusy}
              className="px-2 py-1 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 rounded-lg cursor-pointer transition-all flex items-center justify-center disabled:opacity-50"
              title="Delete User"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
