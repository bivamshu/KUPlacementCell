import { swaggerSpec } from '../config/swagger';

type OpenApiSpec = {
  paths?: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, { properties?: Record<string, unknown>; description?: string }>;
  };
  info?: { description?: string };
};

describe('Phase 7 Milestone B6 - Swagger swipe/match routes', () => {
  it('documents student swipe paths', () => {
    const paths = (swaggerSpec as OpenApiSpec).paths ?? {};

    expect(paths['/swipes']?.post).toBeDefined();
    expect(paths['/swipes/me']?.get).toBeDefined();
    expect(paths['/swipes/{jobId}']?.delete).toBeDefined();
  });

  it('documents company inbound and match paths', () => {
    const paths = (swaggerSpec as OpenApiSpec).paths ?? {};

    expect(paths['/swipes/inbound']?.get).toBeDefined();
    expect(paths['/matches']?.post).toBeDefined();
    expect(paths['/matches/me']?.get).toBeDefined();
  });

  it('defines swipe and match schemas', () => {
    const schemas = (swaggerSpec as OpenApiSpec).components?.schemas ?? {};

    expect(schemas.Swipe).toBeDefined();
    expect(schemas.CreateSwipe).toBeDefined();
    expect(schemas.InboundSwipe).toBeDefined();
    expect(schemas.SwipeStudentSummary).toBeDefined();
    expect(schemas.SwipeUndoResult).toBeDefined();
    expect(schemas.Match).toBeDefined();
    expect(schemas.CreateMatch).toBeDefined();
  });

  it('CreateSwipe documents that right-swipe alone is not a match', () => {
    const schemas = (swaggerSpec as OpenApiSpec).components?.schemas ?? {};
    expect(schemas.CreateSwipe?.description ?? '').toMatch(/does not create a match/i);
    expect(schemas.CreateSwipe?.properties).not.toHaveProperty('company_id');
  });

  it('mentions Phase 7 in OpenAPI info description', () => {
    expect((swaggerSpec as OpenApiSpec).info?.description ?? '').toMatch(/Phase 7/i);
  });
});
