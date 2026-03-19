import { api, getApiErrorMessage } from "@/lib/api/client";

export type ReportType =
  | "contribution_statement"
  | "loan_history"
  | "credit_score_report"
  | "annual_summary";

export async function generateMyFinancialReport(payload: {
  type: ReportType;
  period: string;
  memberName: string;
  memberId?: string;
}) {
  try {
    const res = await api.post("/users/me/reports", payload);
    return res.data?.data as {
      filename: string;
      mimeType: string;
      contentBase64: string;
    };
  } catch (err) {
    throw new Error(getApiErrorMessage(err));
  }
}
