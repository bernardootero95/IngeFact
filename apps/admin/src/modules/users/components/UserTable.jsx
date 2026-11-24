import { Button, Pagination, SortableTh, TableSkeleton, useTableView } from "@ingefact/ui";

const ESTADO = {
  activo: { clase: "bg-brand-50 text-brand-700", label: "Activo" },
  inactivo: { clase: "bg-neutralCustom-100 text-neutralCustom-600", label: "Inactivo" },
};

export default function UserTable({ users = [], loading, onEdit }) {
  const view = useTableView(users, { initialSort: { key: "nombre", dir: "asc" } });

  return (
    <div className="bg-white border border-neutralCustom-100 rounded-brand-lg shadow-sm overflow-hidden">
      {loading ? (
        <TableSkeleton columns={4} label="Cargando usuarios..." />
      ) : users.length === 0 ? (
        <p className="p-12 text-center text-sm text-neutralCustom-500">No hay usuarios registrados.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutralCustom-600">
              <thead className="border-b border-neutralCustom-100 bg-neutralCustom-50 text-xs uppercase text-neutralCustom-500">
                <tr>
                  <SortableTh sortKey="nombre" sort={view.sort} onSort={view.toggleSort}>Nombre</SortableTh>
                  <SortableTh sortKey="email" sort={view.sort} onSort={view.toggleSort}>Correo electrónico</SortableTh>
                  <SortableTh sortKey="estado" sort={view.sort} onSort={view.toggleSort}>Estado</SortableTh>
                  <th scope="col" className="px-6 py-3 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutralCustom-100">
                {view.rows.map((user) => {
                  const estado = ESTADO[user.estado] || { clase: ESTADO.inactivo.clase, label: user.estado };
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-neutralCustom-50">
                      <td className="min-w-[180px] px-6 py-4 font-medium text-neutralCustom-800">{user.nombre}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button onClick={() => onEdit(user)} variant="link">
                          Editar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...view.pagination} />
        </>
      )}
    </div>
  );
}
