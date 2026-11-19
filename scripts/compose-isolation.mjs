import { randomUUID } from "node:crypto";

// Each invocation owns its Compose project and may only clean that project's resources.
export function isolatedComposeArgs(file) {
  const project = `qalab-test-${randomUUID()}`;
  return ["compose", "--project-name", project, "-f", file];
}
