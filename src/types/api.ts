export interface ApiResponse<T> {
  data: T | null
  lastUpdated: string | null
  error: string | null
}
