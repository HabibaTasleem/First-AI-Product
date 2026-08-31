import { useEffect, useState } from 'react'
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage'
import { Loading } from '../../components/Loading/Loading'
import { fetchHealthData, type HealthData } from '../../services/healthService'

export function Health() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadHealthData() {
      try {
        const healthData = await fetchHealthData(controller.signal)
        if (!controller.signal.aborted) {
          setData(healthData)
        }
      } catch (healthError) {
        if (!controller.signal.aborted) {
          setError(
            healthError instanceof Error
              ? healthError.message
              : 'Unable to load health data.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void loadHealthData()

    return () => controller.abort()
  }, [])

  return (
    <main className="health-page">
      <header>
        <h1>Health Check</h1>
        <p>Live response from the health-check endpoint.</p>
      </header>

      {loading && <Loading message="Loading health data..." />}
      {error && <ErrorMessage message={error} />}
      {data && (
        <article className="health-result">
          <h2>Endpoint response</h2>
          <dl>
            <div>
              <dt>ID</dt>
              <dd>{data.id}</dd>
            </div>
            <div>
              <dt>Title</dt>
              <dd>{data.title}</dd>
            </div>
            <div>
              <dt>Message</dt>
              <dd>{data.body}</dd>
            </div>
          </dl>
        </article>
      )}
    </main>
  )
}
