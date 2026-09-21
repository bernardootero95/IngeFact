import { Button, TableSkeleton } from "@ingefact/ui";


export default function UserTable({ users, loading, onEdit }) {
  if (loading) {
    return (
      <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm overflow-hidden">
        <TableSkeleton columns={5} label="Cargando usuarios..." />
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutralCustom-50 border-b border-neutralCustom-100">
            <th className="p-4 text-sm font-medium text-neutralCustom-800">
              Nombre
            </th>
            <th className="p-4 text-sm font-medium text-neutralCustom-800">
              Correo Electrónico
            </th>
            <th className="p-4 text-sm font-medium text-neutralCustom-800">
              Estado
            </th>
            <th className="p-4 text-sm font-medium text-neutralCustom-800">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutralCustom-100">
          {users.length === 0 ? (
            <tr>
              <td
                colSpan="4"
                className="p-4 text-sm text-neutralCustom-500 text-center"
              >
                No hay usuarios registrados.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-neutralCustom-50/50 transition-colors"
              >
                <td className="p-4 text-sm text-neutralCustom-800 font-normal">
                  {user.nombre}
                </td>
                <td className="p-4 text-sm text-neutralCustom-500">
                  {user.email}
                </td>
                <td className="p-4 text-sm">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-brand-md uppercase ${
                      user.estado === "activo"
                        ? "bg-brand-50 text-brand-600"
                        : "bg-red-50 text-fiscal-danger"
                    }`}
                  >
                    {user.estado}
                  </span>
                </td>
                <td className="p-4 text-sm">
                  <Button
                    onClick={() => onEdit(user)}
                    variant="link"
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
