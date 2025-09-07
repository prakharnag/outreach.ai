# 🧪 UNIT TEST SETUP GUIDE
## Outreach.ai - Comprehensive Unit Testing Framework

**PRIORITY: HIGH** - Unit tests ensure code reliability, maintainability, and prevent regressions.

---

## 🎯 UNIT TESTING STRATEGY

### **Testing Philosophy:**
- **Test behavior, not implementation** - Focus on what the code does, not how it does it
- **Arrange, Act, Assert** - Clear test structure for readability
- **One assertion per test** - Each test should verify one specific behavior
- **Descriptive test names** - Test names should clearly describe what is being tested
- **Mock external dependencies** - Isolate units under test from external systems

### **Test Coverage Goals:**
- **Functions:** 100% coverage for business logic
- **Components:** 90% coverage for UI components
- **Hooks:** 100% coverage for custom hooks
- **Utilities:** 100% coverage for utility functions
- **Overall:** 90% minimum code coverage

---

## 🚀 QUICK START GUIDE

### **1. Install Dependencies**
```bash
# Install Jest and React Testing Library
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Install additional testing utilities
npm install --save-dev jest-environment-jsdom @types/jest ts-jest
```

### **2. Configure Jest** (`jest.config.js`)
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/tests/unit/**/*.spec.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### **3. Setup Test Environment** (`jest.setup.js`)
```javascript
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
```

---

## 📁 TEST FILE ORGANIZATION

### **Directory Structure:**
```
tests/
├── unit/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.test.tsx
│   │   │   ├── input.test.tsx
│   │   │   └── modal.test.tsx
│   │   ├── forms/
│   │   │   ├── login-form.test.tsx
│   │   │   └── signup-form.test.tsx
│   │   └── dashboard/
│   │       ├── company-search.test.tsx
│   │       └── message-output.test.tsx
│   ├── lib/
│   │   ├── api.test.ts
│   │   ├── messagingAgent.test.ts
│   │   ├── rateLimiter.test.ts
│   │   └── utils.test.ts
│   ├── hooks/
│   │   ├── useAuth.test.ts
│   │   ├── useUser.test.ts
│   │   └── useLocalStorage.test.ts
│   └── __mocks__/
│       ├── next/
│       ├── supabase/
│       └── external-apis/
```

---

## 🧪 COMPONENT TESTING

### **Button Component Test** (`tests/unit/components/ui/button.test.tsx`)
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should apply correct variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('should show loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### **Form Component Test** (`tests/unit/components/forms/login-form.test.tsx`)
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/forms/login-form';

describe('LoginForm Component', () => {
  it('should render form fields', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const mockOnSubmit = jest.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});
```

---

## 🔧 UTILITY FUNCTION TESTING

### **API Utility Test** (`tests/unit/lib/api.test.ts`)
```typescript
import { apiClient } from '@/lib/api';

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('get', () => {
    it('should make GET request with correct URL', async () => {
      const mockResponse = { data: 'test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.get('/test-endpoint');

      expect(fetch).toHaveBeenCalledWith('/api/test-endpoint', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('404 Not Found');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Network error');
    });
  });

  describe('post', () => {
    it('should make POST request with data', async () => {
      const mockData = { name: 'Test' };
      const mockResponse = { id: 1, ...mockData };
      
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.post('/test-endpoint', mockData);

      expect(fetch).toHaveBeenCalledWith('/api/test-endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData),
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
```

### **Messaging Agent Test** (`tests/unit/lib/messagingAgent.test.ts`)
```typescript
import { messagingAgent } from '@/lib/messagingAgent';

// Mock external dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/api');

describe('MessagingAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmail', () => {
    it('should generate email with correct tone', async () => {
      const mockData = {
        company: 'Google',
        role: 'Software Engineer',
        highlights: '5 years React experience',
        tone: 'conversational',
        contact: { name: 'John Doe', title: 'Hiring Manager' }
      };

      const result = await messagingAgent.generateEmail(mockData);

      expect(result).toContain('John Doe');
      expect(result).toContain('Google');
      expect(result).toContain('Software Engineer');
      expect(result).toMatch(/^(Hi|Hey|Hello)/);
    });

    it('should handle missing contact name', async () => {
      const mockData = {
        company: 'Google',
        role: 'Software Engineer',
        highlights: '',
        tone: 'formal',
        contact: null
      };

      const result = await messagingAgent.generateEmail(mockData);

      expect(result).toContain('Hi there');
      expect(result).toContain('Google');
    });

    it('should throw error for invalid tone', async () => {
      const mockData = {
        company: 'Google',
        role: 'Software Engineer',
        highlights: '',
        tone: 'invalid-tone',
        contact: null
      };

      await expect(messagingAgent.generateEmail(mockData))
        .rejects
        .toThrow('Invalid tone: invalid-tone');
    });
  });

  describe('validateLinkedInMessage', () => {
    it('should remove generic greetings', () => {
      const message = 'Hi there,\n\nI am interested in the position...';
      const result = messagingAgent.validateLinkedInMessage(message);
      
      expect(result).not.toContain('Hi there');
      expect(result).toContain('I am interested');
    });

    it('should preserve proper greetings', () => {
      const message = 'Hi John,\n\nI am interested in the position...';
      const result = messagingAgent.validateLinkedInMessage(message);
      
      expect(result).toContain('Hi John');
      expect(result).toContain('I am interested');
    });
  });
});
```

---

## 🎣 CUSTOM HOOK TESTING

### **useAuth Hook Test** (`tests/unit/hooks/useAuth.test.ts`)
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle login error', async () => {
    const mockError = { message: 'Invalid credentials' };
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('test@example.com', 'wrongpassword');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('should handle logout', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useAuth());

    // Set initial user state
    act(() => {
      result.current.setUser(mockUser);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });
});
```

---

## 🧪 MOCKING STRATEGIES

### **Mock External APIs** (`tests/unit/__mocks__/external-apis.ts`)
```typescript
// Mock Groq API
export const mockGroqAPI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Mocked AI response',
            },
          },
        ],
      }),
    },
  },
};

// Mock Perplexity API
export const mockPerplexityAPI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Mocked research response',
            },
          },
        ],
      }),
    },
  },
};

// Mock Supabase
export const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
};
```

### **Mock Next.js Components** (`tests/unit/__mocks__/next.ts`)
```typescript
// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  },
}));
```

---

## 📊 TEST COVERAGE & REPORTING

### **Coverage Configuration** (`jest.config.js`)
```javascript
module.exports = {
  // ... other config
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './lib/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
```

### **Coverage Scripts** (`package.json`)
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:coverage:open": "jest --coverage && open coverage/index.html",
    "test:ci": "jest --coverage --watchAll=false"
  }
}
```

---

## 🚀 RUNNING TESTS

### **Development Commands:**
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- button.test.tsx

# Run tests matching pattern
npm run test -- --testNamePattern="Button"

# Run tests in specific directory
npm run test -- tests/unit/lib/
```

### **CI/CD Integration:**
```yaml
# .github/workflows/test.yml
name: Unit Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:ci
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

---

## 🎯 BEST PRACTICES

### **Test Naming:**
```typescript
// ✅ GOOD: Descriptive test names
describe('Button Component', () => {
  it('should render with correct text when text prop is provided', () => {
    // test implementation
  });

  it('should be disabled when disabled prop is true', () => {
    // test implementation
  });
});

// ❌ BAD: Vague test names
describe('Button', () => {
  it('should work', () => {
    // test implementation
  });
});
```

### **Test Structure:**
```typescript
// ✅ GOOD: Arrange, Act, Assert pattern
it('should handle click events', () => {
  // Arrange
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  
  // Act
  fireEvent.click(screen.getByRole('button'));
  
  // Assert
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### **Mocking Guidelines:**
```typescript
// ✅ GOOD: Mock at the module level
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// ✅ GOOD: Clear mock setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
});

// ❌ BAD: Mocking implementation details
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockImplementation(() => {
        // Complex implementation
      }),
    },
  },
}));
```

---

## 📋 SUCCESS METRICS

### **Coverage Requirements:**
- **Overall Coverage:** >90%
- **Critical Functions:** 100%
- **UI Components:** >90%
- **Custom Hooks:** 100%
- **Utility Functions:** 100%

### **Quality Gates:**
- ✅ All tests passing
- ✅ Coverage thresholds met
- ✅ No flaky tests
- ✅ Fast test execution (<30 seconds)
- ✅ Clear test documentation

---

**This file serves as the comprehensive unit testing guide. Follow these patterns to ensure robust, maintainable, and reliable code.**
