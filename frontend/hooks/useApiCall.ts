/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { ApiResponse } from "@/types/ApiTypes";
import axios, { Method } from "axios";
import { useCallback } from "react";

export const useApiCall = () => {
  const makeApiCall = useCallback(
    async (
      method: Method,
      endpoint: string,
      data?: any,
    ): Promise<ApiResponse> => {
      try {
        const response = await axios({
          method,
          url: endpoint,
          data,
          withCredentials: true,
        });

        return {
          success: true,
          data: response.data?.data,
          status: response.status,
          message: response.data?.data?.message,
        };
      } catch (e: any) {
        return {
          success: false,
          message: e.response.data?.data?.message,
          status: e.response?.status,
        };
      }
    },
    [],
  );

  return { makeApiCall };
};
