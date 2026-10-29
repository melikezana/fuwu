import { describe, expect, it } from "vitest";
import { isHoldExpired, isOrderOverdue, historyStatuses, serviceActiveStatuses } from "@/lib/commerce/order-state";
import { reconciliationReasons } from "@/lib/commerce/reconciliation-state";
import type { CommerceOrder, OrderStatus } from "@/lib/commerce/types";
const now=Date.parse("2026-10-29T12:00:00+03:00");
describe("order observations; authoritative transitions are tested in PostgreSQL",()=>{
  it("marks only active unfinished services overdue after their end",()=>{
    for(const status of [...serviceActiveStatuses,...historyStatuses,"DISPUTED","PENDING_PAYMENT"] as OrderStatus[]) {
      expect(isOrderOverdue({status,ends_at:new Date(now-1).toISOString()},now)).toBe(serviceActiveStatuses.includes(status));
    }
    expect(isOrderOverdue({status:"IN_PROGRESS",ends_at:new Date(now).toISOString()},now)).toBe(false);
  });
  it("expires holds at the boundary without expiring confirmed, cancelled or refunded orders",()=>{
    expect(isHoldExpired({status:"PENDING_PAYMENT",expires_at:new Date(now).toISOString()},now)).toBe(true);
    expect(isHoldExpired({status:"PENDING_PAYMENT",expires_at:new Date(now+1).toISOString()},now)).toBe(false);
    for(const status of [...historyStatuses,"CONFIRMED"] as OrderStatus[]) expect(isHoldExpired({status,expires_at:new Date(now-1).toISOString()},now)).toBe(false);
  });
  it("reports missing payment evidence and incomplete settlement instead of success",()=>{
    const o={status:"COMPLETED",payment_status:"PAID"} as CommerceOrder;
    expect(reconciliationReasons(o,null,now)).toHaveLength(1);
    expect(reconciliationReasons({...o,payment_status:"UNPAID"},null,now)).toHaveLength(1);
    expect(reconciliationReasons(o,{status:"SUCCEEDED",payout_state:"IN_FLIGHT",refund_state:"NONE",created_at:new Date(now).toISOString(),item_transaction_id:null},now)).toHaveLength(2);
  });
});
