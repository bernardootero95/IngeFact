import React, { useEffect, useState } from "react";
import { supabase } from "@ingefact/core-api";
import Sidebar from "../../../components/Sidebar";
import UserTable from "../components/UserTable";
import UserModal from "../components/UserModal";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("usuarios")
      .select("*")
      .is("eliminado", null)
      .order("creado", { ascending: false });

    if (error) {
      console.error("Error al obtener usuarios:", error.message);
    } else {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleCreateClick = () => {
    setIsEditing(false);
    setCurrentUser(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (user) => {
    setIsEditing(true);
    setCurrentUser(user);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Gestión de Usuarios
          </h2>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-400 text-white text-sm font-medium rounded-brand-md transition-colors"
          >
            Crear Usuario
          </button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <UserTable users={users} loading={loading} onEdit={handleEditClick} />
        </div>
      </main>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEditing={isEditing}
        currentUser={currentUser}
        onSaveSuccess={fetchUsers}
      />
    </div>
  );
}
