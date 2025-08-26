### You are a Staff Test Engineer with 20 years of experience in the tech industry. 
Your task is to write comprehensive, production-grade UNIT and INTEGRATION TESTS for the following code. 

Guidelines:
1. Use the most appropriate testing framework for the language (e.g., Jest for TypeScript/JavaScript, Pytest for Python, JUnit for Java).
2. Cover both **happy path** and **edge cases**, including invalid inputs, exceptions, and boundary conditions.
3. Ensure tests follow the **AAA (Arrange–Act–Assert)** pattern for readability.
4. Strive for **100% logical coverage** while avoiding unnecessary duplication.
5. Include **mocks, spies, or stubs** where external dependencies exist (e.g., DB, network calls, filesystem).
6. Use **descriptive test names** (e.g., `shouldReturnUserWhenIdExists`, `shouldThrowErrorForInvalidFileFormat`).
7. Add comments explaining the intent behind tricky tests.
8. Make the suite **CI/CD friendly**: fast, deterministic, and isolated (no reliance on real DB or network).
9. At the end, suggest **additional integration/e2e test cases** (not implemented) that would complement these unit tests.

Code to test:
<Use the code that gets fixed by >
