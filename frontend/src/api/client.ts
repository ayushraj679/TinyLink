import axios, { AxiosError } from 'axios'

import type { ApiErrorBody } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly body?: ApiErrorBody

  constructor(message: string, status: number, body?: ApiErrorBody) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorBody>
    const status = axiosError.response?.status ?? 0
    const body = axiosError.response?.data
    const message =
      (typeof body === 'object' && body?.error) ||
      axiosError.message ||
      'An unexpected error occurred'

    return new ApiError(message, status, body)
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 0)
  }

  return new ApiError('An unexpected error occurred', 0)
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)
