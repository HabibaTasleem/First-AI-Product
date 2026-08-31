const HEALTH_ENDPOINT = 'https://jsonplaceholder.typicode.com/posts/1'

export interface HealthData {
  id: number
  title: string
  body: string
}

export async function fetchHealthData(signal?: AbortSignal): Promise<HealthData> {
  let response: Response

  try {
    response = await fetch(HEALTH_ENDPOINT, { signal })
  } catch (error) {
    if (signal?.aborted) {
      throw error
    }

    throw new Error('Unable to connect to the health-check service. Please try again.')
  }

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`)
  }

  const data: unknown = await response.json()

  if (!isHealthData(data)) {
    throw new Error('Health check returned an unexpected response.')
  }

  return data
}

function isHealthData(data: unknown): data is HealthData {
  if (!data || typeof data !== 'object') {
    return false
  }

  const healthData = data as Record<string, unknown>
  return (
    typeof healthData.id === 'number' &&
    typeof healthData.title === 'string' &&
    typeof healthData.body === 'string'
  )
}
