import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listUsuariosAdmin } from "@ingefact/core-api";
import { ToastAlert, Button } from "@ingefact/ui";
import Sidebar from "../../../components/Sidebar";
import Footer from "../../../components/Footer";
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
    <div className="min-h-screen flex flex-col md:flex-row bg-neutralCustom-50 font-sans">
      <Sidebar />

      <main className="relative flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        <header className="shrink-0 min-h-16 py-2 md:py-0 md:h-16 bg-white border-b border-neutralCustom-100 flex items-center justify-between gap-3 px-4 md:px-8">
          <div>
            <h2 className="text-lg font-medium text-neutralCustom-800">Usuarios</h2>
            <p className="hidden sm:block text-xs text-neutralCustom-500">Personal interno con acceso a este panel.</p>
          </div>
          <Button
            onClick={() => navigate("/admin/users/new")}
            variant="primary"
          >
            Nuevo usuario
          </Button>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          <UserTable
            users={users}
            loading={loading}
            onEdit={(user) => navigate(`/admin/users/${user.id}/edit`, { state: { user } })}
          />
        </div>
        <Footer />
      </main>

      <ToastAlert
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: null, type: "success" })}
      />
    </div>
  );
}
