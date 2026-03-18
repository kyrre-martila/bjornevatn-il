import Link from "next/link";
import { redirect } from "next/navigation";
import { listAdminTicketOrders } from "../../../../lib/admin/tickets";
import { getMe } from "../../../../lib/me";
import { canManageUsers } from "../../../../lib/roles";
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
  const pageSize = Math.min(100, Math.max(10, Number(searchParams?.pageSize ?? "25") || 25));
  const { items: orders, pagination } = await listAdminTicketOrders({ page, pageSize });

  return (
    <section className="admin-bookings" aria-labelledby="ticket-orders-heading">
      <div className="admin-bookings__header">
        <h1 id="ticket-orders-heading" className="hero__title">
          Ticket orders
        </h1>
      </div>

      <p>
        Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </p>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-bookings__table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Order reference</th>
              <th>Buyer</th>
              <th>Email</th>
              <th>Match</th>
              <th>Quantity</th>
              <th>QR</th>
              <th>Entry state</th>
              <th>Scans</th>
              <th>Last scan</th>
              <th>Created</th>
              <th>Order status</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderReference}>
                <td>{order.orderReference}</td>
                <td>{order.buyerName}</td>
                <td>{order.buyerEmail}</td>
                <td>{order.match}</td>
                <td>{order.quantity}</td>
                <td>{order.qrCodePreview}</td>
                <td>{order.validationStatus === "used" ? "entered" : order.validationStatus}</td>
                <td>{order.scanCount}</td>
                <td>
                  {order.lastScannedAt
                    ? `${new Date(order.lastScannedAt).toLocaleString()} (${order.lastScannedBy ?? "unknown"})`
                    : "-"}
                </td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>{order.status}</td>
                <td>
                  <form action={updateTicketOrderStatusAction}>
                    <input type="hidden" name="orderReference" value={order.orderReference} />
                    <select name="status" defaultValue={order.status === "reserved" ? "confirmed" : order.status}>
                      <option value="confirmed">confirmed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="used">used</option>
                    </select>
                    <button type="submit" className="button-primary">
                      Save
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={12}>No ticket orders found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="admin-bookings__pagination">
        <Link href={`/admin/ticket-orders?page=${Math.max(1, page - 1)}&pageSize=${pageSize}`} aria-disabled={page <= 1}>
          Previous
        </Link>
        <Link href={`/admin/ticket-orders?page=${Math.min(pagination.totalPages, page + 1)}&pageSize=${pageSize}`} aria-disabled={page >= pagination.totalPages}>
          Next
        </Link>
      </div>
    </section>
  );
}
