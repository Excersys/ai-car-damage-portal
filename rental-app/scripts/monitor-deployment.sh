#!/bin/bash

# 🚀 AI Car Rental Deployment Monitor
# Comprehensive deployment monitoring and health checking script

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
GITHUB_REPO="Excersys/ai-car-rental"
API_BASE_URL="https://api.aicarrental.com"  # Replace with actual API URL
STAGING_URL="https://staging.aicarrental.com"
DEV_URL="https://dev.aicarrental.com"

print_header() {
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}🚀 AI Car Rental - Deployment Monitor${NC}"
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

check_git_status() {
    print_section "Git Repository Status"
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    print_info "Current branch: $CURRENT_BRANCH"
    
    # Check if main branch is up to date
    git fetch origin main --quiet
    BEHIND=$(git rev-list --count HEAD..origin/main)
    AHEAD=$(git rev-list --count origin/main..HEAD)
    
    if [ $BEHIND -eq 0 ] && [ $AHEAD -eq 0 ]; then
        print_success "Local main branch is synchronized with origin"
    elif [ $BEHIND -gt 0 ]; then
        print_warning "Local branch is $BEHIND commits behind origin/main"
    elif [ $AHEAD -gt 0 ]; then
        print_warning "Local branch is $AHEAD commits ahead of origin/main"
    fi
    
    # Show recent commits
    echo ""
    print_info "Recent commits:"
    git log --oneline -5 --graph --decorate
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "Uncommitted changes detected"
        git status --porcelain
    else
        print_success "Working directory is clean"
    fi
    
    echo ""
}

check_api_health() {
    local url=$1
    local env_name=$2
    
    print_info "Checking $env_name API health: $url"
    
    # Health check endpoint
    if curl -s --max-time 10 "$url/health" > /dev/null 2>&1; then
        print_success "$env_name API is responding"
        
        # Try to get response details
        response=$(curl -s --max-time 5 "$url/health" 2>/dev/null || echo "No detailed response")
        if [[ $response != "No detailed response" ]]; then
            echo "   Response: $response"
        fi
    else
        print_error "$env_name API is not responding or unreachable"
    fi
}

check_deployment_environments() {
    print_section "Environment Health Checks"
    
    # Check Development Environment
    check_api_health "$DEV_URL" "Development"
    
    # Check Staging Environment  
    check_api_health "$STAGING_URL" "Staging"
    
    # Check Production Environment
    check_api_health "$API_BASE_URL" "Production"
    
    echo ""
}

check_github_actions() {
    print_section "GitHub Actions Deployment Status"
    
    print_info "To monitor GitHub Actions deployment:"
    echo "   1. Visit: https://github.com/$GITHUB_REPO/actions"
    echo "   2. Look for the latest workflow run"
    echo "   3. Check the status of deploy-dev, deploy-staging, deploy-production jobs"
    echo ""
    
    print_info "Expected deployment flow:"
    echo "   • Development: Auto-deployed on main branch push"
    echo "   • Staging: Manual approval required"
    echo "   • Production: Protected deployment with approvals"
    echo ""
}

check_aws_resources() {
    print_section "AWS Infrastructure Status"
    
    # Check if AWS CLI is available
    if command -v aws &> /dev/null; then
        print_info "AWS CLI is available"
        
        # Try to get caller identity (basic AWS connectivity check)
        if aws sts get-caller-identity --output text --query Account &> /dev/null; then
            ACCOUNT_ID=$(aws sts get-caller-identity --output text --query Account 2>/dev/null)
            print_success "Connected to AWS Account: $ACCOUNT_ID"
            
            # Check for CloudFormation stacks
            print_info "Checking CloudFormation stacks..."
            aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query 'StackSummaries[?contains(StackName, `EzCarRental`) || contains(StackName, `ACR`)].{Name:StackName,Status:StackStatus,Updated:LastUpdatedTime}' --output table 2>/dev/null || print_warning "Could not list CloudFormation stacks"
        else
            print_warning "AWS credentials not configured or expired"
        fi
    else
        print_warning "AWS CLI not installed - cannot check AWS resources"
    fi
    
    echo ""
}

check_system_dependencies() {
    print_section "System Dependencies"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js not found"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm: $NPM_VERSION"
    else
        print_error "npm not found"
    fi
    
    # Check CDK
    if command -v cdk &> /dev/null; then
        CDK_VERSION=$(cdk --version)
        print_success "AWS CDK: $CDK_VERSION"
    else
        print_warning "AWS CDK not found - install with: npm install -g aws-cdk"
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        GIT_VERSION=$(git --version)
        print_success "$GIT_VERSION"
    else
        print_error "Git not found"
    fi
    
    echo ""
}

show_monitoring_links() {
    print_section "Monitoring & Management Links"
    
    echo "📊 GitHub Repository:"
    echo "   🔗 https://github.com/$GITHUB_REPO"
    echo ""
    
    echo "🚀 GitHub Actions (Deployment Pipeline):"
    echo "   🔗 https://github.com/$GITHUB_REPO/actions"
    echo ""
    
    echo "🌐 Live Environments:"
    echo "   • Development: $DEV_URL"
    echo "   • Staging: $STAGING_URL"  
    echo "   • Production: $API_BASE_URL"
    echo ""
    
    echo "☁️ AWS Console (if credentials configured):"
    echo "   • CloudFormation: https://console.aws.amazon.com/cloudformation/"
    echo "   • Lambda Functions: https://console.aws.amazon.com/lambda/"
    echo "   • API Gateway: https://console.aws.amazon.com/apigateway/"
    echo "   • CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/"
    echo ""
    
    echo "📈 Admin Dashboard (when deployed):"
    echo "   🔗 $API_BASE_URL/admin"
    echo ""
}

show_troubleshooting() {
    print_section "Troubleshooting Guide"
    
    echo "🔧 Common Issues & Solutions:"
    echo ""
    
    echo "1. Deployment Failed:"
    echo "   • Check GitHub Actions logs for error details"
    echo "   • Verify AWS credentials in GitHub Secrets"
    echo "   • Check CloudFormation stack events"
    echo ""
    
    echo "2. API Not Responding:"
    echo "   • Wait 5-10 minutes for deployment to complete"
    echo "   • Check Lambda function logs in CloudWatch"
    echo "   • Verify API Gateway configuration"
    echo ""
    
    echo "3. Infrastructure Issues:"
    echo "   • Check CloudFormation stack status"
    echo "   • Review CDK deployment logs"
    echo "   • Verify IAM permissions"
    echo ""
    
    echo "4. Frontend Issues:"
    echo "   • Check S3 bucket deployment"
    echo "   • Verify static asset upload"
    echo "   • Check CloudFront distribution (if used)"
    echo ""
}

run_continuous_monitoring() {
    print_section "Continuous Monitoring Mode"
    print_info "Starting continuous monitoring (press Ctrl+C to stop)..."
    echo ""
    
    while true; do
        clear
        print_header
        
        echo -e "${BLUE}🕐 $(date)${NC}"
        echo ""
        
        check_deployment_environments
        
        echo -e "${CYAN}Next check in 30 seconds...${NC}"
        sleep 30
    done
}

show_help() {
    print_header
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  (no args)    - Run complete deployment status check"
    echo "  --monitor    - Start continuous monitoring mode"
    echo "  --health     - Check API health only"
    echo "  --git        - Check git status only"
    echo "  --aws        - Check AWS resources only"
    echo "  --links      - Show monitoring links only"
    echo "  --help       - Show this help message"
    echo ""
}

# Main execution
main() {
    case "${1:-}" in
        --monitor)
            run_continuous_monitoring
            ;;
        --health)
            print_header
            check_deployment_environments
            ;;
        --git)
            print_header
            check_git_status
            ;;
        --aws)
            print_header
            check_aws_resources
            ;;
        --links)
            print_header
            show_monitoring_links
            ;;
        --help)
            show_help
            ;;
        "")
            print_header
            check_git_status
            check_system_dependencies
            check_deployment_environments
            check_aws_resources
            check_github_actions
            show_monitoring_links
            show_troubleshooting
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run the main function with all arguments
main "$@"