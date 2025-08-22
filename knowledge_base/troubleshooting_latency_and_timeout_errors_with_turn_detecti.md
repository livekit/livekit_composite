# Troubleshooting Latency and Timeout Errors with Turn Detection on AWS

If your agent is experiencing severe latency or timeout errors (e. g., `TimeoutError` in `_bounce_eou_task`) even though CPU and memory usage appear low, the root cause may not be obvious. This often happens when deploying to **AWS t3/t4 burstable instance types**.


## Symptoms


- Errors similar to:`{"message": "Error in _bounce_eou_task", "exception": "TimeoutError"}`
- End-of-utterance (EOU) detection timing out (default 3s).
- Model inference that normally takes ~50–160ms instead takes >3s.
- Local testing works fine, but deployed environment on AWS shows extreme latency.
- Cloud monitoring dashboards show **low CPU usage**, suggesting headroom — but latency is still high.


## Root Cause: Burstable Instance CPU Credits

AWS **t3** and **t4g** instances are *burstable*. They don’t provide full CPU performance continuously:


- **Credits accumulate** when CPU usage is below baseline.
- **Credits are spent** when workloads spike (e. g., ONNX model inference in turn detection).
- **When credits run out**, the instance is throttled to a very low baseline (sometimes as low as 10–20% of a core).
- The result: operations that should take 100ms take multiple seconds, leading to timeouts.

⚠ The low CPU graph in CloudWatch is misleading here: it doesn’t show headroom, it shows throttling.


## Solutions


1. **Switch to a non-burstable instance family**Use `m5`, `c5`, `c6i`, or similar families for consistent CPU performance. These provide predictable latency and won’t throttle due to credit exhaustion.
2. **If you must use t3/t4**Monitor **CPU credit balance** (`CPUCreditBalance` metric in CloudWatch). Ensure credits never drop to zero. Consider upgrading to `t3. unlimited`, but note costs may approach those of non-burstable families.
3. **Validate inference runtime**Expected per-turn latency: 50–160ms ( [docs](https://docs. livekit. io/agents/build/turns/turn-detector/#runtime-performance)). Anything beyond ~500ms consistently indicates environment or throttling issues.


## Key Takeaway

Timeouts in `predict_end_of_turn` with low reported CPU usage are often caused by **CPU throttling on burstable EC2 instances**. For production workloads, run LiveKit Agents on **dedicated compute instances** (e. g., `c5. large`, `m5. large`) instead of `t3`.

✅ **Best for production:** non-burstable instances (`m5`, `c5`, `c6i`).❌ **Avoid:** t3/t4 unless you are actively monitoring and managing CPU credits.