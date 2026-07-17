export async function executePipeline(pipeline, handlers = {}) {
  const results = [];

  for (const step of pipeline) {
    const startedAt = Date.now();

    try {
      if (handlers[step.id]) {
        await handlers[step.id]();
      }

      results.push({
        id: step.id,
        label: step.label,
        status: "SUCCESS",
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      results.push({
        id: step.id,
        label: step.label,
        status: "FAILED",
        durationMs: Date.now() - startedAt,
        message: error.message,
      });

      break;
    }
  }

  return results;
}
