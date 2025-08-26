import { POST as messagingApiHandler } from '../app/api/messaging/route';
import { NextRequest } from 'next/server';
import * as dbModule from '../lib/db';
import * as researchAgentModule from '../lib/researchAgent';
import * as verifyAgentModule from '../lib/verifyAgent';
import * as messagingAgentModule from '../lib/messagingAgent';
import * as utilsModule from '../lib/utils';

// Mock all dependencies
jest.mock('../lib/db');
jest.mock('../lib/researchAgent');
jest.mock('../lib/verifyAgent');
jest.mock('../lib/messagingAgent');
jest.mock('../lib/utils');

const mockFindRecentRun = dbModule.findRecentRun as jest.MockedFunction<typeof dbModule.findRecentRun>;
const mockResearchAgent = researchAgentModule.researchAgent as jest.MockedFunction<typeof researchAgentModule.researchAgent>;
const mockVerifierAgent = verifyAgentModule.verifierAgent as jest.MockedFunction<typeof verifyAgentModule.verifierAgent>;
const mockMessagingAgent = messagingAgentModule.messagingAgent as jest.MockedFunction<typeof messagingAgentModule.messagingAgent>;
const mockSanitizeMessageContent = utilsModule.sanitizeMessageContent as jest.MockedFunction<typeof utilsModule.sanitizeMessageContent>;

describe('/api/messaging - Independent Message Generation', () => {
  const createMockRequest = (body: any): NextRequest => {
    return {
      json: async () => body,
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    } as NextRequest;
  };

  const mockVerifiedData = {
    summary: 'Test company analysis',
    points: [
      { claim: 'Test claim', source: { title: 'Test source', url: 'https://test.com' } }
    ],
    contact: {
      primary_contact: { 
        name: 'John Doe', 
        title: 'CEO', 
        email: 'john@test.com' 
      },
      secondary_contact: { 
        name: 'Jane Smith', 
        title: 'CTO', 
        email: 'jane@test.com' 
      }
    }
  };

  const mockMessages = {
    linkedin: 'Test LinkedIn message',
    email: 'Test email message'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockFindRecentRun.mockResolvedValue(null);
    mockResearchAgent.mockResolvedValue({
      summary: 'Test research summary',
      points: [
        { claim: 'Research claim', source: { title: 'Research source', url: 'https://research.com' } }
      ]
    });
    mockVerifierAgent.mockResolvedValue(mockVerifiedData);
    mockMessagingAgent.mockResolvedValue(mockMessages);
    mockSanitizeMessageContent.mockImplementation((content: string) => content);
  });

  describe('Independent Message Type Generation', () => {
    it('should generate only email when messageType is "email"', async () => {
      // Arrange
      const requestBody = {
        company: 'Test Company',
        role: 'Software Engineer',
        highlights: 'React, TypeScript',
        tone: 'formal',
        messageType: 'email'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('email');
      expect(responseData).not.toHaveProperty('linkedin');
      expect(responseData.email).toBe('Test email message');
      expect(mockMessagingAgent).toHaveBeenCalledTimes(1);
    });

    it('should generate only LinkedIn when messageType is "linkedin"', async () => {
      // Arrange
      const requestBody = {
        company: 'Test Company',
        role: 'Software Engineer',
        highlights: 'React, TypeScript',
        tone: 'conversational',
        messageType: 'linkedin'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('linkedin');
      expect(responseData).not.toHaveProperty('email');
      expect(responseData.linkedin).toBe('Test LinkedIn message');
      expect(mockMessagingAgent).toHaveBeenCalledTimes(1);
    });

    it('should generate both messages when messageType is not specified (backward compatibility)', async () => {
      // Arrange
      const requestBody = {
        company: 'Test Company',
        role: 'Software Engineer',
        highlights: 'React, TypeScript',
        tone: 'formal'
        // messageType intentionally omitted
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('linkedin');
      expect(responseData).toHaveProperty('email');
      expect(responseData.linkedin).toBe('Test LinkedIn message');
      expect(responseData.email).toBe('Test email message');
      expect(mockMessagingAgent).toHaveBeenCalledTimes(1);
    });

    it('should generate both messages when messageType is invalid', async () => {
      // Arrange
      const requestBody = {
        company: 'Test Company',
        role: 'Software Engineer',
        highlights: 'React, TypeScript',
        messageType: 'invalid-type'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty('linkedin');
      expect(responseData).toHaveProperty('email');
      expect(mockMessagingAgent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Efficiency Validation', () => {
    it('should call messaging agent only once per request regardless of message type', async () => {
      // Arrange - Test email-only generation
      const emailRequest = createMockRequest({
        company: 'Test Company',
        role: 'Software Engineer',
        messageType: 'email'
      });

      // Act
      await messagingApiHandler(emailRequest);

      // Assert
      expect(mockMessagingAgent).toHaveBeenCalledTimes(1);

      // Reset and test LinkedIn-only generation
      jest.clearAllMocks();
      mockMessagingAgent.mockResolvedValue(mockMessages);
      
      const linkedinRequest = createMockRequest({
        company: 'Test Company',
        role: 'Software Engineer', 
        messageType: 'linkedin'
      });

      await messagingApiHandler(linkedinRequest);
      expect(mockMessagingAgent).toHaveBeenCalledTimes(1);
    });

    it('should pass correct parameters to messaging agent for targeted generation', async () => {
      // Arrange
      const requestBody = {
        company: 'Test Company',
        role: 'Software Engineer',
        highlights: 'React expertise',
        tone: 'intellectual',
        resumeContent: 'Senior developer with 5 years experience',
        useResumeInPersonalization: true,
        messageType: 'email'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      await messagingApiHandler(mockRequest);

      // Assert
      expect(mockMessagingAgent).toHaveBeenCalledWith({
        verified: mockVerifiedData,
        company: 'Test Company',
        role: 'Software Engineer',
        highlights: 'React expertise',
        tone: 'intellectual',
        resumeContent: 'Senior developer with 5 years experience'
      });
    });
  });

  describe('Resume Integration with Message Types', () => {
    it('should include resume content when useResumeInPersonalization is true for email generation', async () => {
      // Arrange
      const requestBody = {
        company: 'Test Company',
        role: 'Senior Developer',
        resumeContent: 'Expert in React and Node.js',
        useResumeInPersonalization: true,
        messageType: 'email'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);

      // Assert
      expect(mockMessagingAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeContent: 'Expert in React and Node.js'
        })
      );
      expect(response.status).toBe(200);
    });

    it('should exclude resume content when useResumeInPersonalization is false', async () => {
      // Arrange
      const requestBody = {
        company: 'Test Company',
        role: 'Senior Developer',
        resumeContent: 'Expert in React and Node.js',
        useResumeInPersonalization: false,
        messageType: 'linkedin'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      await messagingApiHandler(mockRequest);

      // Assert
      expect(mockMessagingAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeContent: undefined
        })
      );
    });
  });

  describe('Caching Behavior', () => {
    it('should use cached data when available and not call research/verify agents', async () => {
      // Arrange
      const cachedRun = {
        verified_json: mockVerifiedData
      };
      mockFindRecentRun.mockResolvedValue(cachedRun as any);
      
      const requestBody = {
        company: 'Cached Company',
        role: 'Engineer',
        messageType: 'email'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      await messagingApiHandler(mockRequest);

      // Assert
      expect(mockFindRecentRun).toHaveBeenCalledWith('Cached Company', 'Engineer', 168); // 24 * 7 hours
      expect(mockResearchAgent).not.toHaveBeenCalled();
      expect(mockVerifierAgent).not.toHaveBeenCalled();
      expect(mockMessagingAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          verified: mockVerifiedData
        })
      );
    });

    it('should perform fresh research when no cache available', async () => {
      // Arrange
      mockFindRecentRun.mockResolvedValue(null);
      
      const requestBody = {
        company: 'New Company',
        role: 'Developer',
        messageType: 'linkedin'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      await messagingApiHandler(mockRequest);

      // Assert
      expect(mockResearchAgent).toHaveBeenCalledWith({
        company: 'New Company',
        role: 'Developer'
      });
      expect(mockVerifierAgent).toHaveBeenCalledWith({
        research: {
          summary: 'Test research summary',
          points: [
            { claim: 'Research claim', source: { title: 'Research source', url: 'https://research.com' } }
          ]
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should return 400 when company is missing', async () => {
      // Arrange
      const requestBody = { role: 'Engineer', messageType: 'email' };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Missing company or role');
    });

    it('should return 400 when role is missing', async () => {
      // Arrange
      const requestBody = { company: 'Test Co', messageType: 'linkedin' };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Missing company or role');
    });

    it('should return 500 when messaging agent throws error', async () => {
      // Arrange
      mockMessagingAgent.mockRejectedValue(new Error('AI service unavailable'));
      
      const requestBody = {
        company: 'Test Company',
        role: 'Engineer',
        messageType: 'email'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.error).toBe('AI service unavailable');
    });

    it('should sanitize message content before returning', async () => {
      // Arrange
      const unsanitizedMessages = {
        linkedin: 'Raw LinkedIn <script>alert("xss")</script>',
        email: 'Raw Email with malicious content'
      };
      mockMessagingAgent.mockResolvedValue(unsanitizedMessages);
      mockSanitizeMessageContent.mockImplementation((content) => content.replace(/<[^>]*>/g, ''));
      
      const requestBody = {
        company: 'Test Company',
        role: 'Engineer',
        messageType: 'linkedin'
      };
      const mockRequest = createMockRequest(requestBody);

      // Act
      const response = await messagingApiHandler(mockRequest);

      // Assert
      expect(mockSanitizeMessageContent).toHaveBeenCalledWith(unsanitizedMessages.linkedin);
      expect(mockSanitizeMessageContent).toHaveBeenCalledWith(unsanitizedMessages.email);
    });
  });
});

/*
INTEGRATION/E2E TEST SUGGESTIONS:
1. Test complete regeneration flow in browser environment with real button clicks
2. Test rate limiting prevention by monitoring actual token usage
3. Test concurrent regeneration requests handling
4. Test network failure scenarios with proper user feedback
5. Test performance impact of selective message generation vs full generation
6. Test real resume upload and personalization in regeneration flow
7. Test tone switching during regeneration maintains proper context
8. Test caching behavior across multiple regeneration attempts
9. Test user experience with loading states and error messages
10. Test cross-browser compatibility for regeneration functionality
*/
