export { closeQueues } from "./connection.js";
export { enqueueInvoice, INVOICE_JOBS, invoiceQueue } from "./invoice.queue.js";
export { enqueueMatching, MATCHING_JOBS, matchingQueue } from "./matching.queue.js";
export { enqueuePayment, PAYMENT_JOBS, paymentQueue } from "./payment.queue.js";
export {
  enqueuePurchaseOrder,
  PURCHASE_ORDER_JOBS,
  purchaseOrderQueue,
} from "./purchaseOrder.queue.js";
export {
  enqueueRequisition,
  REQUISITION_JOBS,
  requisitionQueue,
} from "./requisition.queue.js";
export {
  enqueueSupplierDiscovery,
  SUPPLIER_DISCOVERY_JOBS,
  supplierDiscoveryQueue,
} from "./supplier.queue.js";

import { invoiceQueue } from "./invoice.queue.js";
import { matchingQueue } from "./matching.queue.js";
import { paymentQueue } from "./payment.queue.js";
import { purchaseOrderQueue } from "./purchaseOrder.queue.js";
import { requisitionQueue } from "./requisition.queue.js";
import { supplierDiscoveryQueue } from "./supplier.queue.js";

export const QUEUES = {
  requisition: requisitionQueue,
  supplierDiscovery: supplierDiscoveryQueue,
  purchaseOrder: purchaseOrderQueue,
  invoice: invoiceQueue,
  matching: matchingQueue,
  payment: paymentQueue,
} as const;
