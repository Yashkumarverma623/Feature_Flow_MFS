export interface EvaluationResponse {
  flagKey: string;
  enabled: boolean;
  variant: string;
}

export interface FeatureFlowClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class FeatureFlowClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: FeatureFlowClientOptions) {
    if (!options.apiKey) {
      throw new Error('FeatureFlowClient requires an environment API key.');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:4000/api/v1').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || 5000;
  }

  /**
   * Evaluates a feature flag for a user with optional custom attributes.
   */
  async evaluate(
    flagKey: string,
    userKey: string,
    attributes: Record<string, any> = {}
  ): Promise<EvaluationResponse> {
    const url = new URL(`${this.baseUrl}/evaluate/${encodeURIComponent(flagKey)}`);
    
    // Append attributes as query parameters if GET
    Object.entries(attributes).forEach(([k, v]) => {
      url.searchParams.append(k, String(v));
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-Key': userKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errJson: any = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Evaluation failed with status ${response.status}`);
      }

      const data = (await response.json()) as EvaluationResponse;
      return data;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Evaluation request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Tracks an experiment conversion event for a user.
   */
  async trackEvent(experimentId: string, userKey: string, eventName: string): Promise<boolean> {
    const url = `${this.baseUrl}/experiments/${encodeURIComponent(experimentId)}/events`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ userKey, event: eventName }),
      });

      if (!response.ok) return false;
      const resData: any = await response.json();
      return resData.recorded === true;
    } catch {
      return false;
    }
  }
}
