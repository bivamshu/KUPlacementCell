import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'KUPC API',
    version: config.api.version,
    description:
      'OpenAPI documentation for KUPC backend — Phase 2 auth, Phase 4 resume upload and analysis.'
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Versioned API base path'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      SuccessEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' }
        }
      },
      ErrorEnvelope: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          data: { type: 'null' },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' },
              statusCode: { type: 'integer' }
            }
          }
        }
      },
      UploadResumeResponse: {
        type: 'object',
        properties: {
          resumeId: { type: 'string', format: 'uuid' },
          analysisId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending'] }
        }
      },
      ResumeListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          file_name: { type: 'string' },
          file_url: { type: 'string' },
          uploaded_at: { type: 'string', format: 'date-time' },
          is_active: { type: 'boolean' }
        }
      },
      AnalysisResponse: {
        type: 'object',
        properties: {
          analysisId: { type: 'string', format: 'uuid' },
          resumeId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] },
          error_message: { type: 'string', nullable: true },
          result: { type: 'object', nullable: true }
        }
      }
    }
  },
  paths: {
    '/auth/register/student': {
      post: {
        tags: ['Auth'],
        summary: 'Register a KU student and send OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'full_name', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'student@ku.edu.np' },
                  full_name: { type: 'string', example: 'Ram Sharma' },
                  password: { type: 'string', format: 'password', example: 'password1' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'OTP sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } },
          '400': { description: 'Validation or domain error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } } }
        }
      }
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify student OTP and issue tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'otp'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  otp: { type: 'string', example: '482913' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Tokens issued' },
          '400': { description: 'INVALID_OTP or OTP_EXPIRED' }
        }
      }
    },
    '/auth/register/company': {
      post: {
        tags: ['Auth'],
        summary: 'Register a company account (pending verification)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['company_name', 'email', 'password'],
                properties: {
                  company_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  website: { type: 'string', format: 'uri' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Company registered with pending status' }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Student or company login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'INVALID_CREDENTIALS' },
          '403': { description: 'ACCOUNT_NOT_VERIFIED or ACCOUNT_SUSPENDED' }
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token pair',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refresh_token'],
                properties: {
                  refresh_token: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'New token pair issued' },
          '401': { description: 'INVALID_TOKEN, TOKEN_EXPIRED, or REFRESH_TOKEN_REUSE_DETECTED' }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout current session',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refresh_token'],
                properties: {
                  refresh_token: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': { description: 'Session revoked' },
          '401': { description: 'MISSING_TOKEN or INVALID_TOKEN' }
        }
      }
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Logout all devices for the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'All sessions revoked' }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get authenticated user identity',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current user profile' },
          '401': { description: 'MISSING_TOKEN or INVALID_TOKEN' }
        }
      }
    },
    '/auth/company/verification-documents': {
      post: {
        tags: ['Auth'],
        summary: 'Submit company verification document metadata (placeholder)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Verification request created' }
        }
      }
    },
    '/student/dashboard': {
      get: {
        tags: ['Protected'],
        summary: 'Student dashboard smoke route',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Student access confirmed' },
          '403': { description: 'INSUFFICIENT_ROLE' }
        }
      }
    },
    '/admin/dashboard': {
      get: {
        tags: ['Protected'],
        summary: 'Admin dashboard smoke route',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Admin access confirmed' },
          '403': { description: 'INSUFFICIENT_ROLE' }
        }
      }
    },
    '/jobs': {
      post: {
        tags: ['Protected'],
        summary: 'Create job (Phase 2 placeholder — requires approved company)',
        security: [{ bearerAuth: [] }],
        responses: {
          '201': { description: 'Placeholder job created' },
          '403': { description: 'PENDING_VERIFICATION or INSUFFICIENT_ROLE' }
        }
      }
    },
    '/resumes': {
      get: {
        tags: ['Resumes'],
        summary: 'List authenticated student resumes',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Resume list',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/ResumeListItem' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '403': { description: 'INSUFFICIENT_ROLE' }
        }
      },
      post: {
        tags: ['Resumes'],
        summary: 'Upload PDF resume and enqueue analysis',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'PDF resume file' }
                }
              }
            }
          }
        },
        responses: {
          '202': {
            description: 'Upload accepted',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/UploadResumeResponse' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'RESUME_INVALID_TYPE or RESUME_TOO_LARGE' },
          '403': { description: 'INSUFFICIENT_ROLE' },
          '503': { description: 'RESUME_QUEUE_UNAVAILABLE' }
        }
      }
    },
    '/resumes/{id}': {
      get: {
        tags: ['Resumes'],
        summary: 'Get resume metadata by id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Resume metadata',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ResumeListItem' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': { description: 'RESUME_NOT_FOUND' }
        }
      },
      delete: {
        tags: ['Resumes'],
        summary: 'Delete resume and storage object',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': { description: 'Resume deleted' },
          '404': { description: 'RESUME_NOT_FOUND' }
        }
      }
    },
    '/resumes/{id}/analysis': {
      get: {
        tags: ['Resumes'],
        summary: 'Poll latest analysis for a resume',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Analysis status and result when completed',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/AnalysisResponse' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': { description: 'RESUME_NOT_FOUND or ANALYSIS_NOT_FOUND' }
        }
      }
    }
  }
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: []
});
