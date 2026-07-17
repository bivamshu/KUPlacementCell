import { swaggerSpec } from '../config/swagger';

type OpenApiSpec = {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
};

describe('Phase 5 Milestone B4 - Swagger profile routes', () => {
  it('documents student profile endpoints', () => {
    const spec = swaggerSpec as OpenApiSpec;
    const paths = spec.paths ?? {};

    expect(paths['/students/me']).toBeDefined();
    expect(paths['/students/me/avatar']).toBeDefined();
    expect(paths['/students/{id}']).toBeDefined();
  });

  it('documents company profile endpoints', () => {
    const spec = swaggerSpec as OpenApiSpec;
    const paths = spec.paths ?? {};

    expect(paths['/companies/me']).toBeDefined();
    expect(paths['/companies/me/logo']).toBeDefined();
    expect(paths['/companies/{id}']).toBeDefined();
  });

  it('documents GET and PATCH on /students/me and /companies/me', () => {
    const spec = swaggerSpec as OpenApiSpec;
    const paths = (spec.paths ?? {}) as Record<string, Record<string, unknown>>;

    expect(paths['/students/me']?.get).toBeDefined();
    expect(paths['/students/me']?.patch).toBeDefined();
    expect(paths['/companies/me']?.get).toBeDefined();
    expect(paths['/companies/me']?.patch).toBeDefined();
  });

  it('defines profile schemas', () => {
    const spec = swaggerSpec as OpenApiSpec;
    const schemas = spec.components?.schemas ?? {};

    expect(schemas.StudentProfile).toBeDefined();
    expect(schemas.StudentPublicCard).toBeDefined();
    expect(schemas.UpdateStudentProfile).toBeDefined();
    expect(schemas.CompanyProfile).toBeDefined();
    expect(schemas.CompanyPublicCard).toBeDefined();
    expect(schemas.UpdateCompanyProfile).toBeDefined();
  });

  it('public card schemas do not document private fields', () => {
    const spec = swaggerSpec as OpenApiSpec;
    const schemas = spec.components?.schemas as Record<string, { properties?: Record<string, unknown> }>;

    expect(schemas.StudentPublicCard?.properties).not.toHaveProperty('phone');
    expect(schemas.StudentPublicCard?.properties).not.toHaveProperty('ku_id');
    expect(schemas.CompanyPublicCard?.properties).not.toHaveProperty('verification_status');
  });
});
