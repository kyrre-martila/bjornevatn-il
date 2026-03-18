import { redirect } from "next/navigation";

import { listAdminTicketOrders } from "../../../../lib/admin/tickets";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminPagination } from "../components/AdminPagination";
import { AdminSectionCard } from "../components/AdminSectionCard";
import { AdminStatusBadge } from "../components/AdminStatusBadge";
import { updateTicketOrderStatusAction } from "./actions";

export default async function AdminTicketOrdersPage({
  searchParams,
}: {
  searchParams?: { page?: string; pageSize?: string };
}) {
  const me = await getMe();
  if (!canManageUsers(me?.user?.role)) {
    redirect("/access-denied");
  }

  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(10, Number(searchParams?.pageSize ?? "25") || 25),
  );
  const { items: orders, pagination } = await listAdminTicketOrders({ page, pageSize });

  return (
    <section className="admin-list-page">
      <AdminPageHeader
        title="Ticket orders"
        description="Review buyer details, check-in status, and order state in a consistent shared results table."
      />

      <AdminSectionCard title="Orders" description="Ticket orders show buyer data, validation state, scanning history, and the current order status.">
        {orders.length === 0 ? (
          <AdminEmptyState
            title="No ticket orders yet"
            description="Orders will appear here after supporters complete a ticket purchase."
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-results-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Buyer</th>
                  <th scope="col">Match</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Entry state</th>
                  <th scope="col">Scans</th>
                  <th scope="col">Created</th>
                  <th scope="col">Order status</th>
                  <th scope="col">Update</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.orderReference}>
                    <td data-label="Order">{order.orderReference}</td>
                    <td data-label="Buyer">
                      <div className="admin-table-cell-stack">
                        <span>{order.buyerName}</span>
                        <span>{order.buyerEmail}</span>
                      </div>
                    </td>
                    <td data-label="Match">{order.match}</td>
                    <td data-label="Quantity">{order.quantity}</td>
                    <td data-label="Entry state">
                      <div className="admin-table-cell-stack">
                        <AdminStatusBadge context="ticketValidation" value={order.validationStatus} />
                        <span className="admin-table-help">QR preview: {order.qrCodePreview}</span>
                      </div>
                    </td>
                    <td data-label="Scans">
                      <div className="admin-table-cell-stack">
                        <span>{order.scanCount}</span>
                        <span className="admin-table-help">
                          {order.lastScannedAt
                            ? `${new Date(order.lastScannedAt).toLocaleString()} (${order.lastScannedBy ?? "unknown"})`
                            : "Not scanned yet"}
                        </span>
                      </div>
                    </td>
                    <td data-label="Created">{new Date(order.createdAt).toLocaleString()}</td>
                    <td data-label="Order status">
                      <AdminStatusBadge context="ticketOrder" value={order.status} />
                    </td>
                    <td data-label="Update">
                      <form action={updateTicketOrderStatusAction} className="admin-inline-form">
                        <input type="hidden" name="orderReference" value={order.orderReference} />
                        <label className="admin-inline-form__field">
                          <span className="sr-only">
                            Update order status for {order.orderReference}
                          </span>
                          <select
                            name="status"
                            defaultValue={
                              order.status === "reserved" ? "confirmed" : order.status
                            }
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="used">Used</option>
                          </select>
                        </label>
                        <button type="submit" className="button-primary">
                          Save status
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSectionCard>

      <AdminPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        basePath="/admin/ticket-orders"
        query={{ pageSize: String(pageSize) }}
        ariaLabel="Ticket order pages"
      />
    </section>
  );
}
