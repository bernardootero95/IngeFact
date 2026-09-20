import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listUsuariosAdmin } from "@ingefact/core-api";
import { ToastAlert, Button } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import UserTable from "../components/UserTable";

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: null, type: "success" });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsuariosAdmin();
      setUsers(data);
    } catch (err) {
      setToast({ message: `Error al cargar usuarios: ${err.message}`, type: "error" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen flex bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between px-8">
          <h2 className="text-lg font-medium text-neutralCustom-800">
            Gestión de Usuarios
          </h2>
          <Button
            onClick={() => navigate("/admin/users/new")}
            variant="primary"
          >
            Nuevo usuario
          </Button>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          <UserTable
            users={users}
            loading={loading}
            onEdit={(user) => navigate(`/admin/users/${user.id}/edit`, { state: { user } })}
          />
        </div>
      </main>

      <ToastAlert
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />
    </div>
  );
}
