import { swaggerSpec } from '../config/swagger';

type OpenApiSpec = {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
};

describe('Phase 4 Milestone 8 - Swagger resume routes', () => {
  it('documents resume upload and read endpoints', () => {
    const spec = swaggerSpec as OpenApiSpec;
    const paths = spec.paths ?? {};

    expect(paths['/resumes']).toBeDefined();
    expect(paths['/resumes/{id}']).toBeDefined();
    expect(paths['/resumes/{id}/analysis']).toBeDefined();
  });

  it('defines resume response schemas', () => {
    const spec = swaggerSpec as OpenApiSpec;
    const schemas = spec.components?.schemas ?? {};

    expect(schemas.UploadResumeResponse).toBeDefined();
    expect(schemas.ResumeListItem).toBeDefined();
    expect(schemas.AnalysisResponse).toBeDefined();
  });
});
