import { swaggerSpec } from '../config/swagger';

type OpenApiSpec = {
  paths?: Record<string, Record<string, unknown>>;
  components?: { schemas?: Record<string, { properties?: Record<string, unknown>; description?: string }> };
};

describe('Phase 6 Milestone B5 - Swagger job routes', () => {
  it('documents company job management paths', () => {
    const paths = (swaggerSpec as OpenApiSpec).paths ?? {};

    expect(paths['/jobs']?.post).toBeDefined();
    expect(paths['/jobs/me']?.get).toBeDefined();
    expect(paths['/jobs/me/{id}']?.get).toBeDefined();
    expect(paths['/jobs/me/{id}']?.patch).toBeDefined();
    expect(paths['/jobs/me/{id}']?.delete).toBeDefined();
    expect(paths['/jobs/me/{id}/publish']?.post).toBeDefined();
    expect(paths['/jobs/me/{id}/close']?.post).toBeDefined();
  });

  it('documents discovery and saved-job paths', () => {
    const paths = (swaggerSpec as OpenApiSpec).paths ?? {};

    expect(paths['/jobs']?.get).toBeDefined();
    expect(paths['/jobs/{id}']?.get).toBeDefined();
    expect(paths['/jobs/saved']?.get).toBeDefined();
    expect(paths['/jobs/{id}/save']?.post).toBeDefined();
    expect(paths['/jobs/{id}/save']?.delete).toBeDefined();
  });

  it('defines job schemas', () => {
    const schemas = (swaggerSpec as OpenApiSpec).components?.schemas ?? {};

    expect(schemas.Job).toBeDefined();
    expect(schemas.JobFeedCard).toBeDefined();
    expect(schemas.JobCompanySummary).toBeDefined();
    expect(schemas.CreateJob).toBeDefined();
    expect(schemas.UpdateJob).toBeDefined();
    expect(schemas.SavedToggle).toBeDefined();
  });

  it('UpdateJob schema does not document status as PATCHable', () => {
    const schemas = (swaggerSpec as OpenApiSpec).components?.schemas ?? {};
    expect(schemas.UpdateJob?.properties).not.toHaveProperty('status');
    expect(schemas.CreateJob?.properties).not.toHaveProperty('status');
    expect(schemas.UpdateJob?.description ?? '').toMatch(/status/i);
  });
});
