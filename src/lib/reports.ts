import { api, getApiErrorMessage } from "@/lib/api/client";

export type ReportType =
  | "contribution_statement"
  | "loan_history"
  | "credit_score_report"
  | "annual_summary";

export type ReportPeriodPayload =
  | string
  | {
      type: "year" | "5years" | "10years" | "custom";
      year?: number;
      startDate?: string;
      endDate?: string;
    };

export async function generateMyFinancialReport(payload: {
  type: ReportType;
  period: ReportPeriodPayload;
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
