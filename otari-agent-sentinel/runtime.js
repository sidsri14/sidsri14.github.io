/**
 * Otari Agent Sentinel - In-Browser Runtime
 * Conforms to Open Agentic Web specification
 * (c) 2026 Siddharth Srivastava - MIT License
 */

class SemanticClassifier {
  constructor() {
    this.reasoningTriggers = [
      'prove', 'theorem', 'derive', 'formal verification', 'optimize algorithm',
      'audit smart contract', 'cryptographic', 'complexity analysis', 'differential',
      'mathematical model', 'security vulnerability', 'zero knowledge'
    ];
    this.codeTriggers = [
      'function', 'class', 'refactor', 'typescript', 'rust', 'python', 'async',
      'react', 'component', 'unit test', 'api endpoint', 'sql query', 'interface'
    ];
  }

  classify(prompt) {
    const text = prompt.toLowerCase();
    
    // Check reasoning triggers
    for (const trigger of this.reasoningTriggers) {
      if (text.includes(trigger)) {
        return {
          tier: 'REASONING_FRONTIER',
          model: 'deepseek-ai/DeepSeek-R1',
          rationale: `Matched advanced reasoning trigger: "${trigger}"`,
          estimatedCostPer1k: 0.00525,
          targetLatencyMs: 1200
        };
      }
    }

    // Check code triggers
    for (const trigger of this.codeTriggers) {
      if (text.includes(trigger)) {
        return {
          tier: 'BALANCED_CODE',
          model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
          rationale: `Matched code generation trigger: "${trigger}"`,
          estimatedCostPer1k: 0.00120,
          targetLatencyMs: 450
        };
      }
    }

    // Default fast open-weight
    return {
      tier: 'FAST_OPEN_WEIGHT',
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      rationale: 'Standard prompt: routed to sub-millisecond open-weight model',
      estimatedCostPer1k: 0.00015,
      targetLatencyMs: 180
    };
  }
}

class BudgetGovernor {
  constructor(initialBalanceUsd = 1.00) {
    this.balance = initialBalanceUsd;
    this.reservations = new Map();
    this.totalSavedVsFrontier = 0.00;
  }

  reserve(prompt, tierInfo) {
    const maxTokens = 2048;
    const estimatedCost = (maxTokens / 1000) * tierInfo.estimatedCostPer1k;

    if (this.balance < estimatedCost) {
      throw new Error(`[BUDGET_EXHAUSTED] Remaining balance ($${this.balance.toFixed(4)}) is insufficient for reservation ($${estimatedCost.toFixed(4)}). Execution halted before inference!`);
    }

    const reservationId = 'res_' + Math.random().toString(36).substring(2, 9);
    this.balance -= estimatedCost;
    
    this.reservations.set(reservationId, {
      estimatedCost,
      tierInfo,
      timestamp: Date.now()
    });

    return {
      reservationId,
      reservedAmount: estimatedCost,
      remainingBalance: this.balance
    };
  }

  reconcile(reservationId, actualTokensUsed) {
    const res = this.reservations.get(reservationId);
    if (!res) return null;

    const actualCost = (actualTokensUsed / 1000) * res.tierInfo.estimatedCostPer1k;
    const refund = Math.max(0, res.estimatedCost - actualCost);
    
    this.balance += refund;
    this.reservations.delete(reservationId);

    // Frontier benchmark cost ($0.015 / 1k tokens)
    const frontierCost = (actualTokensUsed / 1000) * 0.015;
    const savings = Math.max(0, frontierCost - actualCost);
    this.totalSavedVsFrontier += savings;

    return {
      actualCost,
      refund,
      newBalance: this.balance,
      savingsVsFrontier: savings
    };
  }
}

class CircuitBreakerRouter {
  constructor() {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.consecutiveFailures = 0;
    this.failureThreshold = 2;
    this.lastFailureTime = 0;
    this.cooldownMs = 8000;
  }

  async dispatch(tierInfo, options = {}) {
    const now = Date.now();

    // Check circuit breaker recovery
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF_OPEN';
      } else {
        // Fallback immediately without calling primary
        return {
          modelUsed: 'Fallback Endpoint (Otari Edge Cached Mirror)',
          status: 'CASCADED',
          circuitState: 'OPEN',
          latencyMs: 45,
          note: `Primary circuit is OPEN (Rate Limit cooldown). Cascaded instantly to secondary mirror!`
        };
      }
    }

    // Force simulation trigger if option set
    if (options.simulate429) {
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      return {
        modelUsed: 'Fallback Endpoint (Mistral-7B Local Mirror)',
        status: 'CASCADED_ON_ERROR',
        circuitState: this.state,
        latencyMs: 78,
        note: `Primary ${tierInfo.model} returned HTTP 429 Rate Limit. Circuit tripped to ${this.state}. Cascaded automatically to backup without interruption!`
      };
    }

    // Normal execution
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
    return {
      modelUsed: tierInfo.model,
      status: 'SUCCESS',
      circuitState: 'CLOSED',
      latencyMs: tierInfo.targetLatencyMs + Math.floor(Math.random() * 50),
      note: `Prompt executed successfully via Mozilla Otari Gateway.`
    };
  }
}

// Export runtime globally
window.OtariSentinelRuntime = {
  classifier: new SemanticClassifier(),
  governor: new BudgetGovernor(1.00),
  router: new CircuitBreakerRouter(),

  async processRequest(prompt, options = {}) {
    const tier = this.classifier.classify(prompt);
    const reservation = this.governor.reserve(prompt, tier);
    const dispatchResult = await this.router.dispatch(tier, options);
    
    // Simulate token count
    const simulatedTokens = Math.floor(Math.random() * 300) + 120;
    const reconciliation = this.governor.reconcile(reservation.reservationId, simulatedTokens);

    return {
      prompt,
      tier,
      reservation,
      dispatchResult,
      tokensUsed: simulatedTokens,
      reconciliation
    };
  }
};
