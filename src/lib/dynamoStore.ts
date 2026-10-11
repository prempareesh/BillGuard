/**
 * BillGuard Persistent Store (Amazon DynamoDB + Local Persistence Cache)
 * Replaces legacy Supabase layer. Adheres strictly to AWS DynamoDB architecture.
 */

import { apiClient, type StoredAuditRecord } from "./apiClient.ts";

const LS_AUDIT_KEY = "billguard_audit_history";
const LS_COMPLAINT_KEY = "billguard_complaints";
const LS_BILLS_KEY = "billguard_user_bills";

// Save audit record to DynamoDB and local client cache
export async function dbSaveAudit(record: StoredAuditRecord): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const existing: StoredAuditRecord[] = JSON.parse(
        localStorage.getItem(LS_AUDIT_KEY) || "[]"
      );
      const filtered = existing.filter((item) => item.id !== record.id);
      localStorage.setItem(LS_AUDIT_KEY, JSON.stringify([record, ...filtered]));
    } catch (e) {
      console.warn("Local storage write warning:", e);
    }
  }

  // Persist to Amazon DynamoDB via FastAPI backend
  await apiClient.saveAuditToDynamo(record);
}

// Fetch all audit records from DynamoDB (with cache fallback)
export async function dbGetAudits(): Promise<StoredAuditRecord[]> {
  try {
    const dynamoRecords = await apiClient.getAuditsFromDynamo();
    if (Array.isArray(dynamoRecords)) {
      if (typeof window !== "undefined") {
        localStorage.setItem(LS_AUDIT_KEY, JSON.stringify(dynamoRecords));
      }
      return dynamoRecords;
    }
  } catch (err) {
    console.warn("Failed fetching audits from DynamoDB:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LS_AUDIT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn(e);
    }
  }
  return [];
}

// Delete single audit record from DynamoDB and cache
export async function dbDeleteAudit(id: string): Promise<void> {
  // First delete from DynamoDB backend (throws if backend fails)
  await apiClient.deleteAuditFromDynamo(id);

  if (typeof window !== "undefined") {
    try {
      const existing: StoredAuditRecord[] = JSON.parse(
        localStorage.getItem(LS_AUDIT_KEY) || "[]"
      );
      const filtered = existing.filter((item) => item.id !== id);
      localStorage.setItem(LS_AUDIT_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn(e);
    }
  }
}

// Save grievance complaint record
export async function dbSaveComplaint(complaint: {
  id: string;
  auditId: string;
  consumerNumber: string;
  discom: string;
  actualBill: number;
  expectedBill: number;
  difference: number;
  status: string;
  letterText?: string;
}): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(LS_COMPLAINT_KEY) || "[]");
      localStorage.setItem(
        LS_COMPLAINT_KEY,
        JSON.stringify([
          {
            ...complaint,
            created_at: new Date().toISOString(),
          },
          ...existing,
        ])
      );
    } catch (e) {
      console.warn(e);
    }
  }

  await apiClient.saveComplaintToDynamo(complaint);
}

// Save user bill document record
export async function dbSaveUserBill(bill: {
  id: string;
  fileName: string;
  fileSize: number;
  consumerNumber: string;
  units: number;
  amount: number;
  s3Key?: string;
}): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(LS_BILLS_KEY) || "[]");
      localStorage.setItem(
        LS_BILLS_KEY,
        JSON.stringify([
          {
            ...bill,
            uploaded_at: new Date().toISOString(),
          },
          ...existing,
        ])
      );
    } catch (e) {
      console.warn(e);
    }
  }
}
