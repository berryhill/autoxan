# Implementation Agent Coding Standards

1. **Code Quality**
   - Write clean, readable, and maintainable code
   - Follow the DRY (Don't Repeat Yourself) principle
   - Keep functions and methods small and focused on a single responsibility
   - Use meaningful variable and function names

2. **Documentation**
   - Add comments for complex logic
   - Include docstrings/JSDoc for public APIs
   - Document any non-obvious design decisions

3. **Error Handling**
   - Implement proper error handling
   - Avoid silent failures
   - Use appropriate error types

4. **Performance**
   - Consider time and space complexity
   - Avoid unnecessary computations
   - Be mindful of memory usage

5. **Security**
   - Validate all inputs
   - Sanitize data before using it in sensitive operations
   - Be aware of common security vulnerabilities

6. **Testing Responsibilities**
   - Write comprehensive unit tests when required by the task
   - Cover edge cases and error scenarios
   - Make code testable by designing for dependency injection

7. **Test File Organization - CRITICAL**
   - NEVER create issue-specific test files (e.g., `test_issue_123_something.py`)
   - Tests MUST be organized by the module/feature they test, NOT by the issue that introduced them
   - Add tests to existing test files for the corresponding module
   - If a new test file is needed, name it after the module being tested (e.g., `test_state.py`, `test_navigation_tools.py`)
   - Issue numbers belong in git commits and PR descriptions, NOT in test file names
