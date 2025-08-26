import { messagingAgent, MessagingAgentInput } from '../lib/messagingAgent';
import * as apiModule from '../lib/api';

// Mock the API module
jest.mock('../lib/api');
const mockCallGroq = apiModule.callGroq as jest.MockedFunction<typeof apiModule.callGroq>;

describe('MessagingAgent', () => {
  const mockVerifiedData = {
    summary: 'Test company summary',
    points: [
      { claim: 'Test claim', source: { title: 'Test source', url: 'https://test.com' } }
    ],
    contact: {
      primary_contact: { 
        name: 'John Doe', 
        title: 'CEO', 
        email: 'john@company.com' 
      },
      secondary_contact: { 
        name: 'Jane Smith', 
        title: 'CTO', 
        email: 'jane@company.com' 
      }
    }
  };

  const baseInput: MessagingAgentInput = {
    verified: mockVerifiedData,
    company: 'Test Company',
    role: 'Software Engineer',
    highlights: 'React, TypeScript, Node.js',
    tone: 'formal'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Happy Path - Complete Data', () => {
    it('should generate proper LinkedIn and email messages with formal tone', async () => {
      // Arrange
      const mockResponse = {
        content: JSON.stringify({
          linkedin: 'Hi John, I hope this message finds you well. I came across Test Company and was impressed by your work.',
          email: 'Subject: Software Engineer Opportunity\\n\\nDear John,\\n\\nI hope this email finds you well. I am writing to express my interest in the Software Engineer position at Test Company.\\n\\nBest regards'
        })
      };
      mockCallGroq.mockResolvedValue(mockResponse);

      // Act
      const result = await messagingAgent(baseInput);

      // Assert
      expect(result).toHaveProperty('linkedin');
      expect(result).toHaveProperty('email');
      expect(result.linkedin).toContain('Hi John');
      expect(result.email).toContain('Subject:');
      expect(result.email).toContain('Dear John');
      expect(mockCallGroq).toHaveBeenCalledTimes(1);
    });

    it('should handle conversational tone correctly without defaulting to "Hi there"', async () => {
      // Arrange
      const conversationalInput = { ...baseInput, tone: 'conversational' as const };
      const mockResponse = {
        content: JSON.stringify({
          linkedin: 'Hey John, I was reading about Test Company and thought, that\'s exactly the kind of place I\'d love to work at.',
          email: 'Subject: Love your work at Test Company\\n\\nHey John,\\n\\nI was reading about Test Company earlier and honestly, it made me stop scrolling.\\n\\nTalk soon?'
        })
      };
      mockCallGroq.mockResolvedValue(mockResponse);

      // Act
      const result = await messagingAgent(conversationalInput);

      // Assert
      expect(result.linkedin).toContain('Hey John');
      expect(result.linkedin).not.toContain('Hi there');
      expect(result.email).toContain('Hey John');
    });

    it('should handle intellectual tone correctly without defaulting to "Hi there"', async () => {
      // Arrange
      const intellectualInput = { ...baseInput, tone: 'intellectual' as const };
      const mockResponse = {
        content: JSON.stringify({
          linkedin: 'Hi John, your recent work at Test Company caught my attention. The approach aligns with my research.',
          email: 'Subject: Research alignment opportunity\\n\\nDear John,\\n\\nYour recent work at Test Company caught my attention.\\n\\nBest regards'
        })
      };
      mockCallGroq.mockResolvedValue(mockResponse);

      // Act
      const result = await messagingAgent(intellectualInput);

      // Assert
      expect(result.linkedin).toContain('Hi John');
      expect(result.linkedin).not.toContain('Hi there');
      expect(result.email).toContain('Dear John');
    });
  });

  describe('Edge Cases - Empty Highlights', () => {
    it('should generate messages successfully with empty highlights', async () => {
      // Arrange
      const emptyHighlightsInput = { ...baseInput, highlights: '' };
      const mockResponse = {
        content: JSON.stringify({
          linkedin: 'Hi John, I hope this message finds you well. I came across Test Company and was impressed.',
          email: 'Subject: Software Engineer Opportunity\\n\\nDear John,\\n\\nI hope this email finds you well.\\n\\nBest regards'
        })
      };
      mockCallGroq.mockResolvedValue(mockResponse);

      // Act
      const result = await messagingAgent(emptyHighlightsInput);

      // Assert
      expect(result).toHaveProperty('linkedin');
      expect(result).toHaveProperty('email');
      expect(result.linkedin).toBeTruthy();
      expect(result.email).toBeTruthy();
    });

    it('should use fallback content when highlights are undefined', async () => {
      // Arrange
      const { highlights, ...inputWithoutHighlights } = baseInput;
      const undefinedHighlightsInput = { ...inputWithoutHighlights, highlights: undefined as any };
      const mockResponse = {
        content: JSON.stringify({
          linkedin: 'Hi John, I hope this message finds you well.',
          email: 'Subject: Software Engineer Opportunity\\n\\nDear John,\\n\\nI hope this email finds you well.\\n\\nBest regards'
        })
      };
      mockCallGroq.mockResolvedValue(mockResponse);

      // Act
      const result = await messagingAgent(undefinedHighlightsInput);

      // Assert
      expect(result).toHaveProperty('linkedin');
      expect(result).toHaveProperty('email');
    });
  });

  describe('Edge Cases - Missing Contact Data', () => {
    it('should handle missing primary contact gracefully', async () => {
      // Arrange
      const noContactInput = {
        ...baseInput,
        verified: {
          ...mockVerifiedData,
          contact: {
            secondary_contact: { name: 'Jane Smith', title: 'CTO' }
          } as any
        }
      };
      const mockResponse = {
        content: JSON.stringify({
          linkedin: 'Hi Jane, I hope this message finds you well.',
          email: 'Subject: Software Engineer Opportunity\\n\\nDear Jane,\\n\\nI hope this email finds you well.\\n\\nBest regards'
        })
      };
      mockCallGroq.mockResolvedValue(mockResponse);

      // Act
      const result = await messagingAgent(noContactInput);

      // Assert
      expect(result.linkedin).toContain('Hi Jane');
      expect(result.email).toContain('Dear Jane');
    });

    it('should use generic greeting when no contact information available', async () => {
      // Arrange
      const noContactInput = {
        ...baseInput,
        verified: {
          ...mockVerifiedData,
          contact: undefined as any
        }
      };
      const mockResponse = {
        content: JSON.stringify({
          linkedin: 'Hi! I hope this message finds you well.',
          email: 'Subject: Software Engineer Opportunity\\n\\nHi,\\n\\nI hope this email finds you well.\\n\\nBest regards'
        })
      };
      mockCallGroq.mockResolvedValue(mockResponse);

      // Act
      const result = await messagingAgent(noContactInput);

      // Assert
      expect(result).toHaveProperty('linkedin');
      expect(result).toHaveProperty('email');
      expect(result.linkedin).not.toContain('Hi there'); // Should not add "Hi there" anymore
    });
  });

  describe('Error Handling - JSON Parsing Issues', () => {
    it('should handle malformed JSON with control characters', async () => {
      // Arrange
      const malformedJsonResponse = {
        content: '{"linkedin":"Hi John,\\nI hope this finds you well.","email":"Subject: Test\\n\\nDear John,\\n\\nTest\\n\\nBest"}'
      };
      mockCallGroq.mockResolvedValue(malformedJsonResponse);

      // Act
      const result = await messagingAgent(baseInput);

      // Assert
      expect(result).toHaveProperty('linkedin');
      expect(result).toHaveProperty('email');
      expect(result.linkedin).toContain('Hi John');
      expect(result.email).toContain('Subject:');
    });

    it('should fall back to generated content when JSON parsing completely fails', async () => {
      // Arrange
      const invalidJsonResponse = {
        content: 'Invalid JSON response from AI'
      };
      mockCallGroq.mockResolvedValue(invalidJsonResponse);

      // Act
      const result = await messagingAgent(baseInput);

      // Assert
      expect(result).toHaveProperty('linkedin');
      expect(result).toHaveProperty('email');
      expect(result.linkedin).toContain('Hi John');
      expect(result.email).toContain('Subject:');
      expect(result.email).toContain('Dear John');
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockCallGroq.mockRejectedValue(new Error('API Error'));

      // Act & Assert
      await expect(messagingAgent(baseInput)).rejects.toThrow('API Error');
    });
  });

  describe('Resume Integration', () => {
    it('should include resume content in message generation when provided', async () => {
      // Arrange
      const resumeInput = {
        ...baseInput,
        resumeContent: 'Senior Software Engineer with 5 years experience in React and Node.js'
      };
      const mockResponse = {
        content: JSON.stringify({
          linkedin: 'Hi John, with my 5 years of React experience, I\'d love to discuss opportunities at Test Company.',
          email: 'Subject: Senior Software Engineer Interest\\n\\nDear John,\\n\\nWith my 5 years of React experience, I believe I could contribute to Test Company.\\n\\nBest regards'
        })
      };
      mockCallGroq.mockResolvedValue(mockResponse);

      // Act
      const result = await messagingAgent(resumeInput);

      // Assert
      expect(result.linkedin).toContain('5 years');
      expect(result.email).toContain('5 years');
      expect(mockCallGroq).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('Resume Content:')
          })
        ]),
        expect.any(Object)
      );
    });
  });
});

/*
INTEGRATION/E2E TEST SUGGESTIONS:
1. End-to-end test with real company data and full pipeline
2. Integration test with actual Groq API responses  
3. Test the complete dashboard flow from company input to message generation
4. Test resume upload and personalization workflow
5. Test error handling with real network failures
6. Test regenerate button functionality with state management
7. Test tone changes affecting message generation
8. Performance test with large input data
9. Test concurrent requests handling
10. Test rate limiting scenarios
*/
