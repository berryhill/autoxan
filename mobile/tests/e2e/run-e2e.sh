#!/bin/bash

# ============================================================================
# Xander Voice App - E2E Test Runner
# ============================================================================
#
# This script runs the End-to-End tests for the Xander Voice App.
#
# Usage:
#   ./run-e2e.sh                    # Run all E2E tests (mocked)
#   ./run-e2e.sh --integration      # Run with real Hermes (requires Hermes running)
#   ./run-e2e.sh --coverage         # Run with coverage report
#   ./run-e2e.sh --watch            # Run in watch mode
#   ./run-e2e.sh conversation       # Run specific test file
#   ./run-e2e.sh --help             # Show this help
#
# Prerequisites for integration tests:
#   1. Start Hermes: hermes gateway start
#   2. Verify: curl http://localhost:8080/health
#
# @see https://github.com/berryhill/autoxan/issues/12
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default options
INTEGRATION_MODE=false
COVERAGE_MODE=false
WATCH_MODE=false
SPECIFIC_TEST=""
VERBOSE=false

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓ ${NC}$1"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${NC}$1"
}

print_error() {
    echo -e "${RED}✗ ${NC}$1"
}

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

# Show help
show_help() {
    cat << EOF
Xander Voice App - E2E Test Runner

Usage:
    $(basename "$0") [OPTIONS] [TEST_FILE]

Options:
    --integration, -i    Run tests against real Hermes instance
    --coverage, -c       Generate coverage report
    --watch, -w          Run tests in watch mode
    --verbose, -v        Verbose output
    --help, -h           Show this help message

Test Files:
    conversation         Run conversation flow tests
    dispatch             Run dispatch flow tests
    gestures             Run gesture control tests
    audioFocus           Run audio focus tests
    errors               Run error scenario tests
    mcpDispatch          Run MCP dispatch integration tests

Examples:
    ./run-e2e.sh                     # Run all E2E tests (mocked)
    ./run-e2e.sh --integration       # Run with real Hermes
    ./run-e2e.sh conversation        # Run only conversation tests
    ./run-e2e.sh -i dispatch         # Integration test dispatch only

Prerequisites for Integration Tests:
    1. Start Hermes agent:
       $ hermes gateway start
       
    2. Verify Hermes is running:
       $ curl http://localhost:8080/health
       
    3. Run integration tests:
       $ ./run-e2e.sh --integration

EOF
}

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --integration|-i)
                INTEGRATION_MODE=true
                shift
                ;;
            --coverage|-c)
                COVERAGE_MODE=true
                shift
                ;;
            --watch|-w)
                WATCH_MODE=true
                shift
                ;;
            --verbose|-v)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            conversation|dispatch|gestures|audioFocus|errors|mcpDispatch)
                SPECIFIC_TEST="$1"
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Check Hermes health (for integration tests)
check_hermes_health() {
    print_info "Checking Hermes health..."
    
    if command -v curl &> /dev/null; then
        HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null || echo "000")
        
        if [ "$HEALTH_RESPONSE" = "200" ]; then
            print_success "Hermes is healthy"
            return 0
        else
            print_error "Hermes is not responding (HTTP $HEALTH_RESPONSE)"
            print_warning "Make sure Hermes is running: hermes gateway start"
            return 1
        fi
    else
        print_warning "curl not available, skipping health check"
        return 0
    fi
}

# Build test command
build_test_command() {
    local CMD="pnpm test"
    local TEST_PATH="tests/e2e"
    
    # Add specific test file if provided
    if [ -n "$SPECIFIC_TEST" ]; then
        TEST_PATH="tests/e2e/${SPECIFIC_TEST}.test.ts"
    fi
    
    # Add test path
    CMD="$CMD $TEST_PATH"
    
    # Add coverage flag
    if [ "$COVERAGE_MODE" = true ]; then
        CMD="$CMD --coverage"
    fi
    
    # Add watch flag
    if [ "$WATCH_MODE" = true ]; then
        CMD="$CMD --watch"
    fi
    
    # Add verbose flag
    if [ "$VERBOSE" = true ]; then
        CMD="$CMD --verbose"
    fi
    
    echo "$CMD"
}

# Run tests
run_tests() {
    print_header "Running E2E Tests"
    
    # Change to project directory
    cd "$PROJECT_ROOT"
    
    # Show test mode
    if [ "$INTEGRATION_MODE" = true ]; then
        print_info "Mode: Integration (real Hermes)"
        export HERMES_INTEGRATION_TEST=true
    else
        print_info "Mode: Unit (mocked)"
    fi
    
    # Build and show command
    local TEST_CMD=$(build_test_command)
    print_info "Command: $TEST_CMD"
    echo ""
    
    # Run tests
    if eval "$TEST_CMD"; then
        print_header "Test Results"
        print_success "All E2E tests passed!"
        return 0
    else
        print_header "Test Results"
        print_error "Some E2E tests failed"
        return 1
    fi
}

# Main execution
main() {
    parse_args "$@"
    
    print_header "Xander Voice App E2E Tests"
    
    # For integration mode, check Hermes health first
    if [ "$INTEGRATION_MODE" = true ]; then
        if ! check_hermes_health; then
            print_error "Aborting: Hermes is not available"
            echo ""
            echo "To start Hermes:"
            echo "  $ hermes gateway start"
            echo ""
            echo "Or run in mocked mode:"
            echo "  $ ./run-e2e.sh"
            exit 1
        fi
    fi
    
    # Run the tests
    run_tests
    EXIT_CODE=$?
    
    # Print summary
    echo ""
    if [ $EXIT_CODE -eq 0 ]; then
        print_success "E2E test run completed successfully"
    else
        print_error "E2E test run failed"
    fi
    
    exit $EXIT_CODE
}

# Run main function with all arguments
main "$@"
