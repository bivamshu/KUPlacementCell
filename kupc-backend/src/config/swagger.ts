import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'KUPC API',
    version: config.api.version,
    description:
      'OpenAPI documentation for KUPC backend — Phase 2 auth, Phase 4 resumes, Phase 5 profiles, Phase 6 jobs, Phase 7 swipes & matches.'
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
      },
      StudentProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ku_id: { type: 'string', example: '078bct000' },
          full_name: { type: 'string' },
          graduation_year: { type: 'integer', nullable: true },
          department: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          degree: { type: 'string', nullable: true },
          cgpa: { type: 'number', nullable: true, minimum: 0, maximum: 4 },
          bio: { type: 'string', nullable: true },
          profile_picture_url: { type: 'string', nullable: true },
          resume_id: { type: 'string', format: 'uuid', nullable: true },
          active_resume: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', format: 'uuid' },
              file_name: { type: 'string' },
              uploaded_at: { type: 'string', format: 'date-time' }
            }
          },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      StudentPublicCard: {
        type: 'object',
        description: 'Public student card — never includes phone or ku_id',
        properties: {
          id: { type: 'string', format: 'uuid' },
          full_name: { type: 'string' },
          graduation_year: { type: 'integer', nullable: true },
          department: { type: 'string', nullable: true },
          degree: { type: 'string', nullable: true },
          cgpa: { type: 'number', nullable: true },
          bio: { type: 'string', nullable: true },
          profile_picture_url: { type: 'string', nullable: true },
          resume_id: { type: 'string', format: 'uuid', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      UpdateStudentProfile: {
        type: 'object',
        minProperties: 1,
        properties: {
          full_name: { type: 'string', minLength: 2, maxLength: 100 },
          phone: { type: 'string', nullable: true },
          degree: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true, maxLength: 2000 },
          department: { type: 'string', nullable: true },
          cgpa: { type: 'number', nullable: true, minimum: 0, maximum: 4 },
          graduation_year: { type: 'integer', nullable: true, minimum: 2000, maximum: 2100 }
        }
      },
      CompanyProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          company_name: { type: 'string' },
          website: { type: 'string', nullable: true },
          industry: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          logo_url: { type: 'string', nullable: true },
          verification_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          verified_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      CompanyPublicCard: {
        type: 'object',
        description: 'Public company card — approved companies only',
        properties: {
          id: { type: 'string', format: 'uuid' },
          company_name: { type: 'string' },
          website: { type: 'string', nullable: true },
          industry: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          logo_url: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      UpdateCompanyProfile: {
        type: 'object',
        minProperties: 1,
        description: 'verification_status and logo_url are not settable via PATCH',
        properties: {
          company_name: { type: 'string', minLength: 2, maxLength: 150 },
          website: { type: 'string', format: 'uri', nullable: true },
          industry: { type: 'string', nullable: true, maxLength: 100 },
          description: { type: 'string', nullable: true, maxLength: 2000 }
        }
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          company_id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          location: { type: 'string', nullable: true },
          job_type: { type: 'string', enum: ['internship', 'full_time', 'part_time'], nullable: true },
          min_cgpa: { type: 'number', nullable: true },
          status: { type: 'string', enum: ['open', 'closed', 'draft'] },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      JobCompanySummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          company_name: { type: 'string' },
          logo_url: { type: 'string', nullable: true },
          industry: { type: 'string', nullable: true },
          website: { type: 'string', nullable: true }
        }
      },
      JobFeedCard: {
        allOf: [
          { $ref: '#/components/schemas/Job' },
          {
            type: 'object',
            properties: {
              company: { $ref: '#/components/schemas/JobCompanySummary' },
              is_saved: { type: 'boolean' }
            }
          }
        ]
      },
      CreateJob: {
        type: 'object',
        required: ['title', 'description'],
        description: 'Creates a draft job. status is never client-settable.',
        properties: {
          title: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', minLength: 20, maxLength: 10000 },
          location: { type: 'string', nullable: true },
          job_type: { type: 'string', enum: ['internship', 'full_time', 'part_time'], nullable: true },
          min_cgpa: { type: 'number', nullable: true, minimum: 0, maximum: 4 }
        }
      },
      UpdateJob: {
        type: 'object',
        minProperties: 1,
        description: 'status is not PATCHable — use publish/close endpoints',
        properties: {
          title: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', minLength: 20, maxLength: 10000 },
          location: { type: 'string', nullable: true },
          job_type: { type: 'string', enum: ['internship', 'full_time', 'part_time'], nullable: true },
          min_cgpa: { type: 'number', nullable: true, minimum: 0, maximum: 4 }
        }
      },
      SavedToggle: {
        type: 'object',
        properties: {
          saved: { type: 'boolean' }
        }
      },
      Swipe: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          student_id: { type: 'string', format: 'uuid' },
          company_id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          direction: { type: 'string', enum: ['left', 'right'] },
          swiped_at: { type: 'string', format: 'date-time' }
        }
      },
      CreateSwipe: {
        type: 'object',
        required: ['job_id', 'direction'],
        description: 'company_id is resolved server-side from the job. Right-swipe alone does not create a match.',
        properties: {
          job_id: { type: 'string', format: 'uuid' },
          direction: { type: 'string', enum: ['left', 'right'] }
        }
      },
      SwipeStudentSummary: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          full_name: { type: 'string' },
          department: { type: 'string', nullable: true },
          graduation_year: { type: 'integer', nullable: true },
          avatar_url: { type: 'string', nullable: true }
        }
      },
      InboundSwipe: {
        type: 'object',
        properties: {
          swipe: { $ref: '#/components/schemas/Swipe' },
          student: { $ref: '#/components/schemas/SwipeStudentSummary' },
          job: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              status: { type: 'string' }
            }
          }
        }
      },
      SwipeUndoResult: {
        type: 'object',
        properties: {
          deleted: { type: 'boolean', example: true }
        }
      },
      Match: {
        type: 'object',
        description: 'Nested job + counterparty cards appear on GET /matches/me',
        properties: {
          id: { type: 'string', format: 'uuid' },
          student_id: { type: 'string', format: 'uuid' },
          company_id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          matched_at: { type: 'string', format: 'date-time' },
          job: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              title: { type: 'string' },
              status: { type: 'string' }
            }
          },
          student: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              full_name: { type: 'string' },
              avatar_url: { type: 'string', nullable: true }
            }
          },
          company: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              company_name: { type: 'string' },
              logo_url: { type: 'string', nullable: true }
            }
          }
        }
      },
      CreateMatch: {
        type: 'object',
        required: ['job_id', 'student_id'],
        description: 'Requires an existing student right-swipe on a job owned by the caller. Idempotent.',
        properties: {
          job_id: { type: 'string', format: 'uuid' },
          student_id: { type: 'string', format: 'uuid' }
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
    },
    '/students/me': {
      get: {
        tags: ['Students'],
        summary: 'Get authenticated student profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Student profile with optional active resume summary',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StudentProfile' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': { description: 'MISSING_TOKEN or INVALID_TOKEN' },
          '403': { description: 'INSUFFICIENT_ROLE (non-student JWT)' },
          '404': { description: 'STUDENT_NOT_FOUND' }
        }
      },
      patch: {
        tags: ['Students'],
        summary: 'Update authenticated student profile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateStudentProfile' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated profile',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StudentProfile' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'VALIDATION_ERROR (e.g. cgpa outside 0–4, empty body)' },
          '403': { description: 'INSUFFICIENT_ROLE' },
          '404': { description: 'STUDENT_NOT_FOUND' }
        }
      }
    },
    '/students/me/avatar': {
      post: {
        tags: ['Students'],
        summary: 'Upload student avatar image (JPEG/PNG/WebP, max 2 MB)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Avatar image file' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Avatar stored; profile with new profile_picture_url',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StudentProfile' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'INVALID_FILE_TYPE or FILE_TOO_LARGE' },
          '403': { description: 'INSUFFICIENT_ROLE' },
          '429': { description: 'Upload rate limit exceeded' }
        }
      }
    },
    '/students/{id}': {
      get: {
        tags: ['Students'],
        summary: 'Get public student card (any authenticated role)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Public card — no phone or ku_id',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/StudentPublicCard' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'VALIDATION_ERROR (non-UUID id)' },
          '404': { description: 'STUDENT_NOT_FOUND' }
        }
      }
    },
    '/companies/me': {
      get: {
        tags: ['Companies'],
        summary: 'Get authenticated company profile (includes verification state)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Company profile including verification_status and verified_at',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/CompanyProfile' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': { description: 'MISSING_TOKEN or INVALID_TOKEN' },
          '403': { description: 'INSUFFICIENT_ROLE (non-company JWT)' },
          '404': { description: 'COMPANY_NOT_FOUND' }
        }
      },
      patch: {
        tags: ['Companies'],
        summary: 'Update authenticated company profile (verification_status not settable)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCompanyProfile' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated profile',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/CompanyProfile' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'VALIDATION_ERROR (invalid website URL, empty body)' },
          '403': { description: 'INSUFFICIENT_ROLE' },
          '404': { description: 'COMPANY_NOT_FOUND' }
        }
      }
    },
    '/companies/me/logo': {
      post: {
        tags: ['Companies'],
        summary: 'Upload company logo image (JPEG/PNG/WebP, max 2 MB)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'Logo image file' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Logo stored; profile with new logo_url',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/CompanyProfile' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'INVALID_FILE_TYPE or FILE_TOO_LARGE' },
          '403': { description: 'INSUFFICIENT_ROLE' },
          '429': { description: 'Upload rate limit exceeded' }
        }
      }
    },
    '/companies/{id}': {
      get: {
        tags: ['Companies'],
        summary: 'Get public company card (approved companies only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Public card without verification internals',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/CompanyPublicCard' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'VALIDATION_ERROR (non-UUID id)' },
          '404': { description: 'COMPANY_NOT_FOUND (unknown, pending, or rejected company)' }
        }
      }
    },
    '/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'List open jobs (Discover feed)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search title/description' },
          {
            name: 'job_type',
            in: 'query',
            schema: { type: 'string', enum: ['internship', 'full_time', 'part_time'] }
          },
          { name: 'location', in: 'query', schema: { type: 'string' } },
          {
            name: 'min_cgpa',
            in: 'query',
            schema: { type: 'number', minimum: 0, maximum: 4 },
            description: 'Jobs with no CGPA requirement or requirement ≤ this value'
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } }
        ],
        responses: {
          '200': {
            description: 'Open jobs from approved companies',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/JobFeedCard' } }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': { description: 'MISSING_TOKEN' }
        }
      },
      post: {
        tags: ['Jobs'],
        summary: 'Create a draft job (verified company)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateJob' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Draft created',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Job' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'VALIDATION_ERROR' },
          '403': { description: 'INSUFFICIENT_ROLE or PENDING_VERIFICATION' }
        }
      }
    },
    '/jobs/me': {
      get: {
        tags: ['Jobs'],
        summary: 'List own company jobs (all statuses)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Company jobs',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/Job' } }
                      }
                    }
                  ]
                }
              }
            }
          },
          '403': { description: 'INSUFFICIENT_ROLE or PENDING_VERIFICATION' }
        }
      }
    },
    '/jobs/me/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get own job by id',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Job detail',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Job' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '403': { description: 'JOB_FORBIDDEN' },
          '404': { description: 'JOB_NOT_FOUND' }
        }
      },
      patch: {
        tags: ['Jobs'],
        summary: 'Update own job fields (not status)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateJob' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Updated job',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Job' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '400': { description: 'VALIDATION_ERROR' },
          '403': { description: 'JOB_FORBIDDEN' },
          '404': { description: 'JOB_NOT_FOUND' }
        }
      },
      delete: {
        tags: ['Jobs'],
        summary: 'Delete own job',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': { description: 'Deleted' },
          '403': { description: 'JOB_FORBIDDEN' },
          '404': { description: 'JOB_NOT_FOUND' }
        }
      }
    },
    '/jobs/me/{id}/publish': {
      post: {
        tags: ['Jobs'],
        summary: 'Publish draft job (draft → open)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Job is now open',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Job' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '409': { description: 'INVALID_JOB_TRANSITION' }
        }
      }
    },
    '/jobs/me/{id}/close': {
      post: {
        tags: ['Jobs'],
        summary: 'Close open job (open → closed)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Job is now closed',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Job' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '409': { description: 'INVALID_JOB_TRANSITION' }
        }
      }
    },
    '/jobs/saved': {
      get: {
        tags: ['Jobs'],
        summary: 'List saved jobs for the current student',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Saved open jobs',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { type: 'array', items: { $ref: '#/components/schemas/JobFeedCard' } }
                      }
                    }
                  ]
                }
              }
            }
          },
          '403': { description: 'INSUFFICIENT_ROLE' }
        }
      }
    },
    '/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get public job detail (open + approved company only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Job feed card',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/JobFeedCard' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': { description: 'JOB_NOT_FOUND (missing, draft, closed, or pending company)' }
        }
      }
    },
    '/jobs/{id}/save': {
      post: {
        tags: ['Jobs'],
        summary: 'Save / bookmark an open job (student)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Saved',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SavedToggle' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': { description: 'JOB_NOT_FOUND' }
        }
      },
      delete: {
        tags: ['Jobs'],
        summary: 'Unsave a job (student, idempotent)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Unsaved',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SavedToggle' }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    },
    '/swipes': {
      post: {
        tags: ['Swipes'],
        summary: 'Record a left/right swipe on an open job (student)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSwipe' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Swipe recorded',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Swipe' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': { description: 'JOB_NOT_FOUND' },
          '409': { description: 'SWIPE_CONFLICT or SWIPE_JOB_NOT_OPEN' }
        }
      }
    },
    '/swipes/me': {
      get: {
        tags: ['Swipes'],
        summary: 'List my swipes (student; optional history)',
        description: 'Optional debug/history endpoint. May return 501 until product needs it.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Swipe history',
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
                          items: { $ref: '#/components/schemas/Swipe' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '501': { description: 'NOT_IMPLEMENTED' }
        }
      }
    },
    '/swipes/inbound': {
      get: {
        tags: ['Swipes'],
        summary: 'List inbound right-swipes on my jobs (verified company)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Inbound interest cards',
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
                          items: { $ref: '#/components/schemas/InboundSwipe' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '403': { description: 'PENDING_VERIFICATION or INSUFFICIENT_ROLE' }
        }
      }
    },
    '/swipes/{jobId}': {
      delete: {
        tags: ['Swipes'],
        summary: 'Undo a swipe within the undo window (student)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'jobId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          '200': {
            description: 'Swipe deleted',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/SwipeUndoResult' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '404': { description: 'SWIPE_NOT_FOUND' },
          '409': { description: 'SWIPE_UNDO_EXPIRED or MATCH_CONFLICT' }
        }
      }
    },
    '/matches': {
      post: {
        tags: ['Matches'],
        summary: 'Create a match after a student right-swipe (verified company)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMatch' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Match created or existing match returned (idempotent)',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessEnvelope' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Match' }
                      }
                    }
                  ]
                }
              }
            }
          },
          '403': { description: 'MATCH_FORBIDDEN (foreign job or no right-swipe)' },
          '404': { description: 'JOB_NOT_FOUND' }
        }
      }
    },
    '/matches/me': {
      get: {
        tags: ['Matches'],
        summary: 'List my matches with nested job + counterparty (student or company)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Matches for the authenticated role',
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
                          items: { $ref: '#/components/schemas/Match' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  }
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: []
});
