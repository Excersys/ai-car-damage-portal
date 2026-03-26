#!/bin/bash

# 🔍 Admin Dashboard Validation Script
# Tests all admin dashboard endpoints and features after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="https://api.aicarrental.com"  # Replace with actual API URL
DEV_API_URL="https://dev.aicarrental.com"
STAGING_API_URL="https://staging.aicarrental.com"

print_header() {
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}🔍 AI Car Rental - Admin Dashboard Validation${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo ""
}

print_section() {
    echo -e "${CYAN}📋 $1${NC}"
    echo -e "${CYAN}----------------------------------------${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

test_basic_health() {
    local url=$1
    local env_name=$2
    
    print_section "Testing Basic Health - $env_name"
    
    # Test basic health endpoint
    print_info "Testing GET $url/"
    if response=$(curl -s --max-time 10 "$url/" 2>/dev/null); then
        if echo "$response" | grep -q "AI Car Rental API is running"; then
            print_success "Basic API is responding correctly"
            echo "   Response: $(echo "$response" | jq -r '.message' 2>/dev/null || echo "$response")"
        else
            print_warning "API responding but unexpected message"
            echo "   Response: $response"
        fi
    else
        print_error "Basic API health check failed"
        return 1
    fi
    
    # Test detailed health endpoint
    print_info "Testing GET $url/health"
    if response=$(curl -s --max-time 10 "$url/health" 2>/dev/null); then
        if echo "$response" | grep -q "healthy\|status"; then
            print_success "Detailed health endpoint is working"
            
            # Extract key information
            status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")
            version=$(echo "$response" | jq -r '.version' 2>/dev/null || echo "unknown")
            admin_status=$(echo "$response" | jq -r '.features.adminDashboard' 2>/dev/null || echo "unknown")
            
            echo "   Status: $status"
            echo "   Version: $version" 
            echo "   Admin Dashboard: $admin_status"
        else
            print_warning "Health endpoint responding but unexpected format"
            echo "   Response: $response"
        fi
    else
        print_error "Detailed health endpoint failed"
    fi
    
    # Test deployment status endpoint  
    print_info "Testing GET $url/deployment/status"
    if response=$(curl -s --max-time 10 "$url/deployment/status" 2>/dev/null); then
        if echo "$response" | grep -q "adminDashboard\|features"; then
            print_success "Deployment status endpoint is working"
            
            admin_feature_status=$(echo "$response" | jq -r '.features.adminDashboard.status' 2>/dev/null || echo "unknown")
            echo "   Admin Dashboard Feature Status: $admin_feature_status"
        else
            print_warning "Deployment status endpoint responding but unexpected format"
        fi
    else
        print_error "Deployment status endpoint failed"
    fi
    
    echo ""
}

test_admin_endpoints() {
    local url=$1
    local env_name=$2
    
    print_section "Testing Admin Dashboard Endpoints - $env_name"
    
    # Note: These tests don't include authentication tokens
    # In production, you would need valid admin tokens
    
    local endpoints=(
        "/admin/dashboard"
        "/admin/users" 
        "/admin/vehicles"
        "/admin/bookings"
        "/admin/analytics/financial"
        "/admin/system/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        print_info "Testing GET $url$endpoint (without auth - expecting 401/403)"
        
        # Test without authentication - should return 401 or similar
        http_code=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$url$endpoint" 2>/dev/null || echo "000")
        
        if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
            print_success "Endpoint exists and requires authentication (HTTP $http_code)"
        elif [ "$http_code" = "200" ]; then
            print_warning "Endpoint responding without authentication - check security"
        elif [ "$http_code" = "404" ]; then
            print_error "Endpoint not found (HTTP 404) - routing issue"
        elif [ "$http_code" = "000" ]; then
            print_error "Endpoint unreachable - connection failed"
        else
            print_warning "Unexpected response code: HTTP $http_code"
        fi
    done
    
    echo ""
}

test_cors_and_security() {
    local url=$1
    local env_name=$2
    
    print_section "Testing CORS and Security Headers - $env_name"
    
    # Test CORS preflight
    print_info "Testing CORS preflight request"
    if response=$(curl -s -I -X OPTIONS \
        -H "Origin: https://app.aicarrental.com" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Authorization" \
        --max-time 10 "$url/admin/dashboard" 2>/dev/null); then
        
        if echo "$response" | grep -q "Access-Control-Allow"; then
            print_success "CORS headers present"
        else
            print_warning "CORS headers not found"
        fi
    else
        print_error "CORS preflight test failed"
    fi
    
    # Test security headers on main endpoint
    print_info "Testing security headers"
    if headers=$(curl -s -I --max-time 10 "$url/" 2>/dev/null); then
        if echo "$headers" | grep -q "X-Content-Type-Options\|X-Frame-Options"; then
            print_success "Security headers detected"
        else
            print_warning "Security headers not found"
        fi
    else
        print_error "Could not retrieve headers"
    fi
    
    echo ""
}

test_admin_dashboard_integration() {
    local url=$1
    local env_name=$2
    
    print_section "Testing Admin Dashboard Integration - $env_name"
    
    # Test that admin routes are properly configured
    print_info "Verifying admin route structure"
    
    # Test admin root path
    http_code=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$url/admin" 2>/dev/null || echo "000")
    if [ "$http_code" = "404" ]; then
        print_info "Admin root returns 404 (expected - no handler for /admin)"
    else
        print_info "Admin root returns HTTP $http_code"
    fi
    
    # Test that the API Gateway is routing admin requests correctly
    print_info "Testing API Gateway routing for admin endpoints"
    
    # Try to get more detailed error responses to verify routing
    for endpoint in "/admin/dashboard" "/admin/users"; do
        response=$(curl -s --max-time 10 "$url$endpoint" 2>/dev/null || echo "connection_failed")
        
        if echo "$response" | grep -q "Unauthorized\|Missing\|token\|authentication"; then
            print_success "Endpoint $endpoint properly requires authentication"
        elif echo "$response" | grep -q "connection_failed"; then
            print_error "Connection failed for $endpoint"
        elif echo "$response" | grep -q "Not Found\|404"; then
            print_error "Endpoint $endpoint not found - routing issue"
        else
            print_info "Endpoint $endpoint: $(echo "$response" | head -c 100)..."
        fi
    done
    
    echo ""
}

validate_deployment_completion() {
    local url=$1
    local env_name=$2
    
    print_section "Deployment Completion Validation - $env_name"
    
    # Check if deployment status indicates completion
    if response=$(curl -s --max-time 10 "$url/deployment/status" 2>/dev/null); then
        admin_status=$(echo "$response" | jq -r '.features.adminDashboard.status' 2>/dev/null || echo "unknown")
        
        case "$admin_status" in
            "deployed")
                print_success "Admin Dashboard deployment completed successfully"
                ;;
            "deploying")
                print_warning "Admin Dashboard still deploying"
                return 1
                ;;
            "unknown")
                print_warning "Cannot determine admin dashboard deployment status"
                ;;
            *)
                print_info "Admin Dashboard status: $admin_status"
                ;;
        esac
    else
        print_error "Cannot check deployment status"
        return 1
    fi
    
    # Check health endpoint for admin dashboard feature
    if response=$(curl -s --max-time 10 "$url/health" 2>/dev/null); then
        admin_feature=$(echo "$response" | jq -r '.features.adminDashboard' 2>/dev/null || echo "unknown")
        
        case "$admin_feature" in
            "active")
                print_success "Admin Dashboard feature is active"
                ;;
            "deploying")
                print_warning "Admin Dashboard feature still deploying"
                return 1
                ;;
            *)
                print_info "Admin Dashboard feature status: $admin_feature"
                ;;
        esac
    fi
    
    echo ""
}

run_full_validation() {
    local url=$1
    local env_name=$2
    
    print_header
    echo -e "${BLUE}🔍 Running full validation for: $env_name${NC}"
    echo -e "${BLUE}🌐 URL: $url${NC}"
    echo ""
    
    # Run all validation tests
    local overall_success=true
    
    if ! test_basic_health "$url" "$env_name"; then
        overall_success=false
    fi
    
    if ! validate_deployment_completion "$url" "$env_name"; then
        overall_success=false
    fi
    
    test_admin_endpoints "$url" "$env_name"
    test_cors_and_security "$url" "$env_name"
    test_admin_dashboard_integration "$url" "$env_name"
    
    # Summary
    print_section "Validation Summary"
    if [ "$overall_success" = true ]; then
        print_success "Deployment validation completed successfully"
        print_info "Admin Dashboard is ready for testing"
    else
        print_warning "Some validation checks failed or deployment still in progress"
        print_info "Wait a few minutes and try again"
    fi
    
    echo ""
    print_info "Next steps:"
    echo "   1. Set up admin user accounts with appropriate roles"
    echo "   2. Test role-based authentication"
    echo "   3. Verify dashboard UI functionality"
    echo "   4. Test all admin operations"
}

wait_for_deployment() {
    local url=$1
    local env_name=$2
    local max_attempts=30
    local attempt=1
    
    print_header
    echo -e "${BLUE}⏳ Waiting for deployment to complete: $env_name${NC}"
    echo -e "${BLUE}🌐 URL: $url${NC}"
    echo ""
    
    while [ $attempt -le $max_attempts ]; do
        echo -e "${CYAN}Attempt $attempt/$max_attempts - $(date)${NC}"
        
        # Check basic connectivity first
        if response=$(curl -s --max-time 10 "$url/health" 2>/dev/null); then
            admin_status=$(echo "$response" | jq -r '.features.adminDashboard' 2>/dev/null || echo "unknown")
            
            if [ "$admin_status" = "active" ]; then
                print_success "Admin Dashboard is now active!"
                echo ""
                run_full_validation "$url" "$env_name"
                return 0
            else
                print_info "Admin Dashboard status: $admin_status"
            fi
        else
            print_info "API not yet responding..."
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            echo "   Waiting 30 seconds before next check..."
            sleep 30
        fi
        
        ((attempt++))
    done
    
    print_warning "Deployment monitoring timed out after $((max_attempts * 30 / 60)) minutes"
    print_info "You can manually check the GitHub Actions progress at:"
    echo "   🔗 https://github.com/Excersys/ai-car-rental/actions"
}

show_help() {
    print_header
    echo "Usage: $0 [option] [environment]"
    echo ""
    echo "Options:"
    echo "  validate      - Run full validation tests"
    echo "  wait         - Wait for deployment completion then validate"
    echo "  health       - Quick health check only"
    echo "  endpoints    - Test admin endpoints only"
    echo "  help         - Show this help message"
    echo ""
    echo "Environments:"
    echo "  dev          - Development environment"
    echo "  staging      - Staging environment"  
    echo "  production   - Production environment (default)"
    echo ""
    echo "Examples:"
    echo "  $0 validate production"
    echo "  $0 wait dev"
    echo "  $0 health"
}

# Main execution
main() {
    local action="${1:-validate}"
    local environment="${2:-production}"
    
    # Set URL based on environment
    case "$environment" in
        "dev"|"development")
            url="$DEV_API_URL"
            env_name="Development"
            ;;
        "staging")
            url="$STAGING_API_URL"
            env_name="Staging"
            ;;
        "production"|"prod")
            url="$API_BASE_URL"
            env_name="Production"
            ;;
        *)
            echo "Unknown environment: $environment"
            show_help
            exit 1
            ;;
    esac
    
    case "$action" in
        "validate")
            run_full_validation "$url" "$env_name"
            ;;
        "wait")
            wait_for_deployment "$url" "$env_name"
            ;;
        "health")
            test_basic_health "$url" "$env_name"
            ;;
        "endpoints")
            test_admin_endpoints "$url" "$env_name"
            ;;
        "help")
            show_help
            ;;
        *)
            echo "Unknown action: $action"
            show_help
            exit 1
            ;;
    esac
}

# Run the main function with all arguments
main "$@"