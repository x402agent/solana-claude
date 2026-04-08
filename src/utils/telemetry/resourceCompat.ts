import { Resource } from '@opentelemetry/resources'

export function resourceFromAttributes(
  attributes: Record<string, unknown>,
): Resource {
  return new Resource(attributes)
}
