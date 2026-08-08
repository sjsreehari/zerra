/* eslint-disable @typescript-eslint/no-explicit-any */
export type ApiResponse = {
  data?: any;
  status: number;
  message: string;
  user?: string;
  success: boolean;
  token?: string
}


